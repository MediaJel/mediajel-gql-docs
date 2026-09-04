#!/usr/bin/env node
/**
 * Asks the assistant a fixed set of questions and checks every query it
 * produces against the schema.
 *
 * The assistant's prose always sounds confident, so reading the answers is not
 * a test. This validates what it actually emits — both the queries it prints
 * and the ones it asks the browser to run — and prints PASS/FAIL per question.
 *
 *   yarn dev            # in another terminal
 *   node scripts/test-assistant-answers.js
 *
 * Override the server with MJ_DOCS_URL. Exits non-zero if anything fails.
 */

const http = require("http");

const BASE = process.env.MJ_DOCS_URL || "http://localhost:3006";

// Uses http directly rather than fetch, so this runs on Node < 18 too.
function post(path, body) {
  return new Promise((resolve) => {
    const target = new URL(BASE + path);
    const payload = Buffer.from(JSON.stringify(body));
    const req = http.request(
      {
        hostname: target.hostname,
        port: target.port || 80,
        path: target.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": payload.length,
        },
      },
      (res) => {
        let data = "";
        res.setEncoding("utf-8");
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, text: data }));
      }
    );
    req.on("error", (e) => resolve({ status: 0, text: String(e.message) }));
    req.setTimeout(180000, () => {
      req.destroy();
      resolve({ status: 0, text: "timed out" });
    });
    req.write(payload);
    req.end();
  });
}

/** Prose the assistant streamed, reassembled from the data-stream parts. */
function prose(stream) {
  return stream
    .split("\n")
    .filter((l) => l.startsWith('0:"'))
    .map((l) => {
      try {
        return JSON.parse(l.slice(2));
      } catch {
        return "";
      }
    })
    .join("");
}

/** Every query the answer contains: printed code blocks and tool calls alike. */
function queriesFrom(stream) {
  const found = [];

  const text = prose(stream);
  const block = /```graphql\n([\s\S]*?)```/g;
  let m;
  while ((m = block.exec(text)) !== null) {
    const code = m[1].trim();
    // Illustrative field lists get fenced as graphql too. The UI gives those no
    // run button, so they are not queries this can hold the assistant to.
    if (!/^(query|mutation)\b/.test(code)) continue;
    // The json block right after a query is its variables, and a wrong key
    // there (email for username) is invisible if we only check the query.
    let variables;
    const after = text.slice(block.lastIndex, block.lastIndex + 800);
    const vars = after.match(/^\s*(?:\*\*Variables:?\*\*\s*)?```json\n([\s\S]*?)```/);
    if (vars) {
      try {
        variables = JSON.parse(vars[1]);
      } catch {
        /* not variables */
      }
    }
    found.push({ source: "shown", query: code, variables });
  }

  for (const line of stream.split("\n")) {
    if (!line.startsWith("9:")) continue;
    try {
      const call = JSON.parse(line.slice(2));
      // checkQuery carries args.query too, but that is the model validating its
      // own work — only an actual runQuery is a query aimed at real data.
      if (call.toolName === "runQuery" && call.args && call.args.query) {
        found.push({
          source: "run",
          query: call.args.query,
          variables: call.args.variables,
        });
      }
    } catch {
      /* partial line */
    }
  }
  return found;
}

const CASES = [
  // Previously broken, now expected to hold.
  { id: "createdBy", signedIn: true, ask: [
      { role: "user", content: "give me one example task" },
      { role: "assistant", content: "Here is a task: id cmqez5yh0016m0b115dphcjtu, Analytics Task." },
      { role: "user", content: "who created this task? use createdBy { id name }" },
  ] },
  { id: "connection-object-fields", signedIn: true, ask: "Using lineItemsConnection, give me each line item node's id, name, adGroup, targetingType and aggregateData." },
  { id: "article-category-title", signedIn: false, ask: "How do I list the topic buckets our blog posts are filed under?" },
  { id: "auth-signin", signedIn: false, ask: "How do I authenticate?" },
  { id: "single-campaign-doc", signedIn: false, ask: "Show me a query to get a single campaign by ID" },
  { id: "campaigns-for-org", signedIn: false, ask: "Show me how to list all campaigns for an organization" },
  { id: "name-and-date-filter", signedIn: false, ask: "Find campaigns whose name contains Test and that were created after January 2026." },
  { id: "product-enum-category", signedIn: false, ask: "Give me all products in the edibles category, sorted by price from lowest to highest, limit 15." },
  { id: "campaigns-by-spend", signedIn: false, ask: "I want campaigns with a total budget over 10000 that started in the last 30 days. Sort them by spend, highest first." },
  { id: "product-with-brand", signedIn: true, clientLoop: true, ask: "show me one product with its brand and category" },
  { id: "example-campaign", signedIn: true, clientLoop: true, ask: "give me one example campaign in my current org" },
  { id: "count-orgs", signedIn: true, ask: "how many organizations do I have?" },

  // Known to still fail — kept so regressions and fixes are both visible.
  { id: "campaign-order-reporting", signedIn: true, known: true, ask: "In campaignOrdersConnection, I want each node's impressions, clicks, spend and budgetSpent, plus totalCount on the connection. Show me the query." },
  { id: "lineitem-createdBy", signedIn: true, ask: "Using lineItemsConnection, show me each line item node's id, the createdBy user's name, plus spend, conversions and pacingData." },
  { id: "lineitem-direct-metrics", signedIn: true, ask: "show me line items with their clicks, impressions and ctr" },
  { id: "catalog-menu", signedIn: true, known: true, ask: "How do I pull the menu of items available at one of our dispensary locations?" },
  { id: "performance-reports", signedIn: true, known: true, ask: "How do I get campaign performance reports (impressions, clicks, spend) out of the API?" },
  { id: "task-filter-assignee", signedIn: false, known: true, ask: "How do I filter tasks by assignee and by due date this month?" },
];

async function main() {
  const health = await post("/api/validate-query", { query: "query { campaigns(first:1){ id } }" });
  if (health.status !== 200) {
    console.error(`Cannot reach ${BASE} — start the dev server first (yarn dev).`);
    process.exit(2);
  }

  console.log(`assistant: ${BASE}\n`);
  const pad = (s, n) => String(s).padEnd(n);
  let failed = 0;
  let knownFailed = 0;

  for (const testCase of CASES) {
    const messages =
      typeof testCase.ask === "string"
        ? [{ role: "user", content: testCase.ask }]
        : testCase.ask;

    const res = await post("/api/chat", {
      messages,
      hasSession: testCase.signedIn,
    });

    const queries = queriesFrom(res.text);
    const problems = [];

    if (!queries.length) {
      problems.push("no query produced");
    }

    for (const q of queries) {
      const check = await post("/api/validate-query", {
        query: q.query,
        variables: q.variables,
      });
      let body = {};
      try {
        body = JSON.parse(check.text);
      } catch {
        body = { errors: ["validator did not answer"] };
      }
      if (body.errors && body.errors.length) {
        problems.push(`[${q.source}] ${body.errors[0]}`);
      }
      const placeholder = JSON.stringify(q.variables || {}).match(
        /"(example-[a-z-]*|your-[a-z-]+)"/i
      );
      if (q.source === "run" && placeholder) {
        problems.push(`[run] placeholder ${placeholder[1]} would match nothing`);
      }
    }

    const ok = problems.length === 0;
    const onlyPlaceholder =
      problems.length > 0 && problems.every((p) => p.includes("placeholder"));
    // The browser rejects a placeholder id in runGraphQLQuery and hands the
    // error back to the model, which retries. This script does not run that
    // client loop, so a placeholder here is unproven rather than broken.
    const unproven = !ok && testCase.clientLoop && onlyPlaceholder;
    if (!ok && !unproven) {
      failed++;
      if (testCase.known) knownFailed++;
    }
    const label = ok
      ? "PASS"
      : unproven
        ? "UNPROVEN"
        : testCase.known
          ? "FAIL(known)"
          : "FAIL";
    console.log(
      `${pad(label, 12)} ${pad(testCase.id, 26)} ${
        problems[0] ? problems[0].slice(0, 90) : `${queries.length} query(s) valid`
      }`
    );
    for (const extra of problems.slice(1, 3)) {
      console.log(`${pad("", 12)} ${pad("", 26)} ${extra.slice(0, 90)}`);
    }
  }

  const newFailures = failed - knownFailed;
  console.log(
    `\n${CASES.length - failed}/${CASES.length} passed. ` +
      `${knownFailed} known failure(s), ${newFailures} new.`
  );
  console.log(
    "UNPROVEN = the browser's tool-retry loop would likely recover; " +
      "this script cannot run that loop. Check those two by hand in the UI."
  );
  if (newFailures > 0) {
    console.log("A new failure means something regressed — check that case.");
  }
  process.exit(newFailures > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
