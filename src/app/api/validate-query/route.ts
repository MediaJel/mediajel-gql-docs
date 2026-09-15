import { validateQueryDocument, validateQueryVariables } from "@/lib/schema";

/**
 * Ceiling on what this endpoint will parse.
 *
 * graphql's parser builds an AST far larger than its source — a 9.7MB document
 * measured at ~790MB of heap, enough to OOM the 1Gi production pod, and the
 * ingress allows bodies up to 10MB. The endpoint is unauthenticated, so nothing
 * else stops that. Real queries are a few KB; the largest documented example in
 * this repo is well under 4KB.
 */
const MAX_QUERY_CHARS = 20000;

/** Variable payloads are coerced field by field, so they need a cap too. */
const MAX_VARIABLES_CHARS = 20000;

/**
 * Validates a query, and its variables, against the schema.
 *
 * The schema is ~1.7MB, so the browser cannot check a query itself. This lets
 * the assistant's output be verified before a user copies it or runs it.
 */
export async function POST(req: Request) {
  try {
    const { query, variables } = await req.json();
    if (typeof query !== "string" || !query.trim()) {
      return Response.json({ valid: false, errors: ["No query provided."] });
    }
    if (query.length > MAX_QUERY_CHARS) {
      return Response.json({
        valid: false,
        errors: [
          `Query is ${query.length} characters; this endpoint validates up to ${MAX_QUERY_CHARS}.`,
        ],
      });
    }
    if (
      variables !== undefined &&
      JSON.stringify(variables).length > MAX_VARIABLES_CHARS
    ) {
      return Response.json({
        valid: false,
        errors: [
          `Variables exceed ${MAX_VARIABLES_CHARS} characters; validate a smaller payload.`,
        ],
      });
    }

    const errors = validateQueryDocument(query);
    // Only worth checking values once the document itself parses cleanly.
    if (!errors.length && variables && typeof variables === "object") {
      errors.push(...validateQueryVariables(query, variables));
    }

    return Response.json({ valid: errors.length === 0, errors });
  } catch (error) {
    return Response.json({
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
    });
  }
}
