#!/usr/bin/env node
/**
 * Runs every operation the docs publish against a live endpoint, using the
 * example query shown on its own docs page. Answers the question the docs
 * cannot answer for themselves: does the thing we tell customers to copy
 * actually work?
 *
 * Single-record operations need a real id, so their example variables are
 * filled from the matching list operation before they run.
 *
 *   node scripts/verify-published-operations.js <username> <password> <orgId>
 *
 * Endpoint defaults to dojo; override with MJ_ENDPOINT.
 */

const path = require("path");
const https = require("https");
const {
  parse,
  print,
  visit,
  buildSchema,
  validate,
  specifiedRules,
} = require("graphql");
const fs = require("fs");

// Test whatever the docs are configured to talk to, so a pass here means the
// playground works too. MJ_ENDPOINT overrides.
function endpointFromEnvFile() {
  try {
    const env = fs.readFileSync(path.resolve(__dirname, "../.env.local"), "utf-8");
    const match = env.match(/^\s*NEXT_PUBLIC_GQL_ENDPOINT\s*=\s*(.+)$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

const ENDPOINT =
  process.env.MJ_ENDPOINT ||
  endpointFromEnvFile() ||
  "https://graphql-dojo.dmp.mediajel.ninja/";

const CONTENT = path.resolve(__dirname, "../src/content");
const config = JSON.parse(
  fs.readFileSync(path.join(CONTENT, "public-api-config.json"), "utf-8")
);
const schema = buildSchema(
  fs.readFileSync(path.join(CONTENT, "public-schema.graphql"), "utf-8")
);
const overrides = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../src/lib/example-overrides.json"),
    "utf-8"
  )
);

// The published allowlist, read from the module so the two cannot drift.
const allowlistSrc = fs.readFileSync(
  path.resolve(__dirname, "../src/lib/public-operations.ts"),
  "utf-8"
);
function namesFrom(marker) {
  const i = allowlistSrc.indexOf(marker);
  const start = allowlistSrc.indexOf("[", i);
  const end = allowlistSrc.indexOf("] as const", i);
  return [...allowlistSrc.slice(start, end).matchAll(/"([^"]+)"/g)].map(
    (m) => m[1]
  );
}
const QUERIES = namesFrom("const CUSTOMER_FACING_QUERIES");
const MUTATIONS = namesFrom("const PUBLIC_MUTATIONS");

// Single-record operations and the list operation that can supply an id.
const ID_SOURCE = {
  campaign: "campaigns",
  campaignOrder: "campaignOrders",
  lineItem: "lineItems",
  org: "orgs",
  brand: "brands",
  product: "products",
  strain: "strains",
  catalog: "catalogItems",
  article: "articles",
  articleCategory: "articleCategories",
  getRecommendedProduct: "products",
  getRecommendationValue: "products",
};

const [, , username, password, orgId] = process.argv;

// Uses https directly rather than fetch, so the script runs on Node < 18 too.
function post(url, body, headers) {
  return new Promise((resolve) => {
    const target = new URL(url);
    const payload = Buffer.from(JSON.stringify(body));
    const req = https.request(
      {
        hostname: target.hostname,
        port: target.port || 443,
        path: target.pathname + target.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": payload.length,
          ...headers,
        },
      },
      (res) => {
        let data = "";
        res.setEncoding("utf-8");
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ status: res.statusCode, text: data }));
      }
    );
    req.on("error", (err) => resolve({ status: 0, text: String(err.message) }));
    req.setTimeout(30000, () => {
      req.destroy();
      resolve({ status: 0, text: "request timed out" });
    });
    req.write(payload);
    req.end();
  });
}

async function gql(query, variables, headers = {}) {
  const res = await post(
    ENDPOINT,
    { query, variables: variables || {} },
    headers
  );
  try {
    return { status: res.status, ...JSON.parse(res.text) };
  } catch {
    return {
      status: res.status,
      errors: [{ message: (res.text || "no response").slice(0, 120) }],
    };
  }
}

/** Replaces the leaf selection with `id` so we can cheaply harvest one. */
function idProbe(listOp) {
  const example = config.operations.queries[listOp];
  if (!example) return null;
  const doc = parse(example.exampleQuery);
  let replaced = false;
  const stripped = visit(doc, {
    Field(node) {
      if (node.name.value !== listOp || replaced) return;
      replaced = true;
      return {
        ...node,
        selectionSet: node.selectionSet && {
          kind: "SelectionSet",
          selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
        },
      };
    },
  });
  // Same filter stripping as above, or the probe inherits the placeholder
  // `where` and harvests nothing.
  const variables = { ...(example.exampleVariables || {}) };
  if (variables.where && typeof variables.where === "object") {
    const kept = Object.entries(variables.where).filter(
      ([, v]) => !(typeof v === "string" && v.startsWith("example-"))
    );
    if (kept.length) variables.where = Object.fromEntries(kept);
    else delete variables.where;
  }
  return { query: print(stripped), variables };
}

async function main() {
  if (!username || !password || !orgId) {
    console.error(
      "usage: node scripts/verify-published-operations.js <username> <password> <orgId>"
    );
    console.error("(Cognito username, not email — e.g. 'janedoe', not 'jane@example.com')");
    process.exit(2);
  }

  console.log(`endpoint: ${ENDPOINT}`);
  console.log(`publishing ${QUERIES.length} queries + ${MUTATIONS.length} mutation\n`);

  // 1. Sign in. This is also the authSignIn operation under test.
  const signIn = await gql(
    `mutation SignIn($data: AuthSignInInput!) {
       authSignIn(data: $data) { accessToken idToken refreshToken }
     }`,
    { data: { username, password } }
  );
  const tokens = signIn.data && signIn.data.authSignIn;
  if (!tokens || !tokens.idToken) {
    console.error("authSignIn FAILED:", JSON.stringify(signIn.errors || signIn));
    process.exit(1);
  }
  console.log("authSignIn                       OK  (idToken received)\n");

  // The ID token is what the API validates — the access token has no `aud`.
  const auth = {
    Authorization: `Bearer ${tokens.idToken}`,
    Key: orgId,
  };

  // 2. Harvest ids for the single-record operations.
  const ids = {};
  for (const listOp of new Set(Object.values(ID_SOURCE))) {
    const probe = idProbe(listOp);
    if (!probe) continue;
    const r = await gql(probe.query, probe.variables, auth);
    const payload = r.data && r.data[listOp];
    const first = Array.isArray(payload)
      ? payload[0]
      : payload && payload.edges && payload.edges[0] && payload.edges[0].node;
    if (first && first.id) ids[listOp] = first.id;
    await new Promise((r) => setTimeout(r, 400));
  }

  // 3. Run every published operation's own documented example.
  const results = [];
  for (const name of QUERIES) {
    const op = config.operations.queries[name];
    if (!op) {
      results.push({ name, status: "NOT-IN-CONFIG" });
      continue;
    }

    // Same corrections the docs pages apply, so this tests what customers see.
    const override = overrides[name] || {};
    let query = override.exampleQuery || op.exampleQuery;
    let variables = {
      ...(override.exampleVariables || op.exampleVariables || {}),
    };

    // Mirrors stripPlaceholderFilter() in src/lib/schema.ts: a `where` filled
    // with "example-" placeholders matches nothing, so list examples drop it.
    if (!ID_SOURCE[name] && variables.where && typeof variables.where === "object") {
      const kept = Object.entries(variables.where).filter(
        ([, v]) => !(typeof v === "string" && v.startsWith("example-"))
      );
      if (kept.length) variables.where = Object.fromEntries(kept);
      else delete variables.where;
    }

    // Fill placeholder ids with a real one where we found it. Ids are nested —
    // `{ where: { id: "example-id" } }` — so this has to recurse, not just scan
    // the top level.
    const source = ID_SOURCE[name];
    let substituted = false;
    if (source && ids[source]) {
      const fill = (obj) => {
        for (const key of Object.keys(obj)) {
          const value = obj[key];
          if (value && typeof value === "object") fill(value);
          else if (/id$/i.test(key) && typeof value === "string") {
            obj[key] = ids[source];
            substituted = true;
          }
        }
      };
      variables = JSON.parse(JSON.stringify(variables));
      fill(variables);
    }

    const formErrors = validate(schema, parse(query), specifiedRules);
    if (formErrors.length) {
      results.push({
        name,
        status: "INVALID-EXAMPLE",
        detail: formErrors[0].message,
      });
      continue;
    }

    const r = await gql(query, variables, auth);
    const errs = (r.errors || []).map((e) => e.message);
    const payload = r.data ? r.data[name] : undefined;
    // An empty list still counts as a successful call, but "OK" alone would hide
    // that nothing came back — report the row count so an empty org is visible.
    let rows = null;
    if (Array.isArray(payload)) rows = payload.length;
    else if (payload && Array.isArray(payload.edges)) rows = payload.edges.length;
    const hasData = payload !== null && payload !== undefined;

    let status;
    if (r.status === 429) status = "RATE-LIMITED";
    else if (errs.some((m) => /Not Authorised/i.test(m))) status = "NOT-AUTH";
    else if (errs.length) status = "ERROR";
    else if (hasData) status = "OK";
    else if (ID_SOURCE[name] && !substituted) status = "UNTESTED-NO-ID";
    else status = "OK-EMPTY";

    results.push({
      name,
      status,
      rows,
      detail:
        errs[0] ||
        (status === "UNTESTED-NO-ID"
          ? "no real id available; ran with the placeholder"
          : undefined),
    });
    await new Promise((r) => setTimeout(r, 400));
  }

  const pad = (s, n) => String(s).padEnd(n);
  for (const r of results) {
    const rowNote = r.rows === null || r.rows === undefined ? "" : `${r.rows} row(s)`;
    console.log(
      `${pad(r.name, 32)} ${pad(r.status, 16)} ${pad(rowNote, 10)} ${r.detail ? r.detail.slice(0, 60) : ""}`
    );
  }

  const tally = results.reduce((a, r) => {
    a[r.status] = (a[r.status] || 0) + 1;
    return a;
  }, {});
  console.log("\n" + JSON.stringify(tally, null, 1));

  const bad = results.filter(
    (r) => !["OK", "OK-EMPTY", "UNTESTED-NO-ID"].includes(r.status)
  ).length;
  const untested = results.filter((r) => r.status === "UNTESTED-NO-ID").length;
  if (untested) {
    console.log(
      `\n${untested} single-record operation(s) could not be exercised with a ` +
        `real id — the org has no records of that type. They are authorized ` +
        `(no "Not Authorised!"), but returning data is unproven.`
    );
  }
  console.log(
    bad === 0
      ? "\nAll published operations answered."
      : `\n${bad} operation(s) did not answer — see above.`
  );
  process.exit(bad === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
