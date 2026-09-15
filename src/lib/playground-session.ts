const AUTH_STORAGE_KEY = "mediajel_playground_auth";

/** Largest tool result handed back to the model, in characters. */
const MAX_RESULT_CHARS = 6000;

export interface PlaygroundSession {
  idToken: string;
  orgId: string;
}

/**
 * The session the playground is signed in with.
 *
 * Embedded in the dashboard the token arrives as a URL parameter and the
 * playground mirrors it into localStorage, but that write is best-effort —
 * browsers that partition third-party storage leave it empty while the
 * playground itself keeps working from the URL. Read the URL first so the
 * assistant works everywhere the playground does.
 */
// Assistants fence illustrative field lists as graphql too. Those are not
// queries anyone can run, so they get no validity badge and no run button.
export function isRunnableQuery(code: string): boolean {
  return /^\s*(query|mutation)\b/.test(code);
}

export function getPlaygroundSession(): PlaygroundSession | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const orgId = params.get("orgId");
  if (params.get("embedded") === "true" && token && orgId) {
    return { idToken: token, orgId };
  }

  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;
    const data = JSON.parse(stored);
    return data.idToken && data.orgId
      ? { idToken: data.idToken, orgId: data.orgId }
      : null;
  } catch {
    return null;
  }
}

/**
 * Seconds until the ID token expires, or null if it cannot be read.
 * Cognito ID tokens last about an hour, and an expired one fails exactly like
 * a wrong organization — both come back as `Not Authorised!`.
 */
export function secondsUntilExpiry(idToken: string): number | null {
  try {
    const payload = JSON.parse(atob(idToken.split(".")[1]));
    return typeof payload.exp === "number"
      ? payload.exp - Math.floor(Date.now() / 1000)
      : null;
  } catch {
    return null;
  }
}

/**
 * Checks a query against the schema via the server, which holds it.
 *
 * Returns no errors if the check itself fails — a validator outage should not
 * block a query that may well be fine.
 */
export async function validateQuery(
  query: string,
  variables?: Record<string, unknown>
): Promise<string[]> {
  try {
    const res = await fetch("/api/validate-query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    const body = await res.json();
    return Array.isArray(body.errors) ? body.errors : [];
  } catch {
    return [];
  }
}

export interface QueryToolResult {
  ok: boolean;
  data?: unknown;
  errors?: string[];
  truncated?: boolean;
  note?: string;
}

/**
 * Runs a read-only operation against the API with the viewer's own session.
 *
 * This runs in the browser on purpose: the customer's ID token is never sent
 * to the docs server, so the docs cannot read another organization's data.
 */
export async function runGraphQLQuery(
  query: string,
  variables?: Record<string, unknown>
): Promise<QueryToolResult> {
  const session = getPlaygroundSession();
  if (!session) {
    return {
      ok: false,
      errors: ["Not signed in. Sign in on the Playground page first."],
    };
  }

  // The assistant only documents queries; refuse anything that could write.
  if (/\bmutation\b/i.test(query)) {
    return {
      ok: false,
      errors: ["This assistant only runs read-only queries, not mutations."],
    };
  }

  // A documented placeholder is a real string to the API, so it matches nothing
  // and returns `null` — which reads as "you have no campaigns" rather than
  // "you passed a placeholder". Send the model back to find a real id.
  const placeholder = JSON.stringify(variables ?? {}).match(
    /"(example-[a-z-]*|your-[a-z-]+|<[^"]+>)"/i
  );
  if (placeholder) {
    return {
      ok: false,
      errors: [
        `The variables still contain the placeholder ${placeholder[1]}, which matches no record. ` +
          `Get a real id first — list the records with \`first: 1\` — then query by that id.`,
      ],
    };
  }

  // Check against the schema before spending a round trip. An invalid query
  // comes back to the model as an error it can correct on the next step.
  const invalid = await validateQuery(query, variables);
  if (invalid.length) {
    return {
      ok: false,
      errors: [
        `Query is not valid against the schema, so it was not run: ${invalid[0]}`,
      ],
    };
  }

  // Catch the expired case before the round trip, so it is not reported as a
  // generic authorization failure.
  const remaining = secondsUntilExpiry(session.idToken);
  if (remaining !== null && remaining <= 0) {
    return {
      ok: false,
      errors: [
        "Your session expired. Sign in again on the Playground page, then retry.",
      ],
    };
  }

  const endpoint =
    process.env.NEXT_PUBLIC_GQL_ENDPOINT || "http://localhost:4000";

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.idToken}`,
        Key: session.orgId,
      },
      body: JSON.stringify({ query, variables: variables || {} }),
    });

    const body = await res.json();
    let errors = Array.isArray(body.errors)
      ? body.errors.map((e: { message?: string }) => e.message || String(e))
      : undefined;

    // `Not Authorised!` is the same message for every cause. Say which one it
    // is, since the org rule is not obvious: the backend only accepts the
    // organization on the account's FIRST role, not any org it can see.
    if (errors?.some((m: string) => /not authoris/i.test(m))) {
      errors = [
        ...errors,
        `The API rejected this request. The token is still valid for ${
          remaining !== null ? `${Math.floor(remaining / 60)} min` : "an unknown time"
        }, so the likely cause is the organization: the Key header is "${session.orgId}", and the API only accepts the organization on the first role of your account. Check that org ID on the Playground page.`,
      ];
    }

    // A large result would crowd out the rest of the conversation. Hand the
    // model a truncated string rather than malformed JSON.
    let data = body.data;
    let truncated = false;
    const serialized = JSON.stringify(data ?? null);
    if (serialized && serialized.length > MAX_RESULT_CHARS) {
      data = serialized.slice(0, MAX_RESULT_CHARS) + "…[truncated]";
      truncated = true;
    }

    return {
      ok: !errors,
      data,
      errors,
      truncated,
      note: truncated
        ? "Result truncated. Narrow the query with `first` or fewer fields."
        : undefined,
    };
  } catch (error) {
    return {
      ok: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
