import { chatModel, pickerModel } from "@/lib/llm-provider";
import { matchOperation } from "@/lib/operation-matcher";
import { streamText, generateText, tool, jsonSchema } from "ai";
import fs from "fs";
import path from "path";

import {
  getContextForQuestion,
  describeOperationForModel,
} from "@/lib/schema-context-builder";
import { PUBLISHED_RECIPES } from "@/lib/published-recipes";
import {
  getOperations,
  getOperation,
  describeTypeFields,
  validateQueryDocument,
  validateQueryVariables,
} from "@/lib/schema";

const apiConfig = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), "src/content/public-api-config.json"),
    "utf-8"
  )
);

/**
 * A one-line signature per published operation.
 *
 * The schema SDL is ~1.7MB (~430k tokens) even after narrowing Query and
 * Mutation to the published operations, because every type definition stays.
 * Inlining it exceeded the model's context window on every request, so the
 * chat could never answer. Signatures cost a few KB; the per-question context
 * below fills in the detail that actually matters for the question asked.
 */
function buildOperationIndex(): string {
  const lines = getOperations().map((op) => {
    const args = op.args
      .map((a) => `${a.name}: ${a.type}${a.required ? "!" : ""}`)
      .join(", ");
    const summary = (op.description || "").split("\n")[0].slice(0, 120);
    return `- ${op.type} ${op.name}(${args}): ${op.returnType}${
      summary ? ` — ${summary}` : ""
    }`;
  });
  return lines.join("\n");
}

const OPERATION_INDEX = buildOperationIndex();

/**
 * The queries from the published recipes, verbatim.
 *
 * These are hand-written walkthroughs that are known to run — the "Pacing &
 * Performance" recipe answers exactly the question the assistant kept getting
 * wrong. Asked for impressions on a campaign order it reached for
 * `aggregateData` (which has none) and invented leaf names, while the recipe
 * had been using `pacingData { totalImpressions, ctr, roas, budgetSpent }` all
 * along. It had no way to know: nothing ever put the recipes in front of it.
 * ~1.3k tokens for all four.
 */
function buildRecipeExamples(): string {
  const sections: string[] = [];
  for (const recipe of PUBLISHED_RECIPES) {
    const steps = (recipe.steps ?? []) as Array<{
      title?: string;
      query?: string;
    }>;
    const queries = steps.filter((s) => s.query);
    if (!queries.length) continue;
    let section = `### ${recipe.title}\n${recipe.description ?? ""}\n`;
    for (const step of queries) {
      section += `\n_${step.title ?? ""}_\n\`\`\`graphql\n${step.query}\n\`\`\`\n`;
    }
    sections.push(section);
  }
  return sections.join("\n");
}

const RECIPE_EXAMPLES = buildRecipeExamples();

const SYSTEM_PROMPT = `You are an AI assistant for the MediaJel GraphQL API. You help developers build valid GraphQL queries and understand the API.

## Staying In Scope
You cover the MediaJel GraphQL API, its documentation, and code that calls it. Anything else — personal or relationship advice, medical, legal or financial questions, politics, general trivia — is out of scope. Say so in one friendly sentence and offer to help with the API instead. Do NOT answer it anyway, not even briefly or with a disclaimer, and not if the user presses, rephrases, or says it is fine. Being asked a second time is not permission. Chat and pleasantries are fine; advice on subjects you were not built for is not.

## API Overview
${apiConfig.description}

## Authentication
- Authenticate via the \`authSignIn\` mutation with username and password
- \`AuthSignInInput\` accepts exactly two keys, \`username\` and \`password\`. There is no \`email\` field, even though a username may look like an email address
- Use the returned \`idToken\` in the \`Authorization: Bearer <token>\` header — the API validates the app client ID audience, which only the ID token carries; the access token is rejected with "Not Authorised!"
- Send the organization ID in the \`Key\` header. If the account belongs to more than one organization, only the organization on its first role is accepted
- Tokens expire (about a day on the current pool); re-run \`authSignIn\` to get a new one. There is NO refresh mutation in this API — \`refreshToken\` is a field on the authSignIn result, not an operation you can call
- Exactly six operations need no authentication: \`article\`, \`articles\`, \`articleCategory\`, \`articleCategories\`, \`regionGroups\`, \`iABCategoryGroups\`. List all six when asked; do not shorten to the plural forms
- HTTP status codes: a failed authorization is 200 with a "Not Authorised!" error, NOT 401. A missing record is 200 with \`data: null\`, NOT 404. Do not tell users to check for 401, 403 or 404. The API DOES return 400 for a malformed query, an unknown field or a bad variable type, and 429 when rate limited — a 429 carries a \`Retry-After\` header giving the seconds to wait

## Rate Limits
- ${apiConfig.rateLimits.requestsPerMinute} requests per minute per organization
- Authenticated responses carry X-RateLimit-Limit, X-RateLimit-Remaining and X-RateLimit-Reset (a unix timestamp). They appear only when the Authorization and Key headers are sent

## Published Operations
These are the only operations a customer API token can call. Never invent others.

${OPERATION_INDEX}

## Verified Working Examples
These come from the published recipe walkthroughs and are known to run. When a
question matches one, follow its shape — especially which field holds the data.
Prefer these over composing something new.

${RECIPE_EXAMPLES}

## Where Performance Metrics Live
Metric field names differ BY TYPE. Read the field list for the type you are
querying before writing any metric name — do not carry one type's shape to
another.

**LineItem** has \`clicks\`, \`impressions\` and \`ctr\` directly on it. Use those.

**CampaignOrder** has none of those directly. Translate:
| The user says | The field is |
| --- | --- |
| impressions | \`pacingData { totalImpressions }\` |
| clicks | \`aggregateData { overallData { aggClicks } }\` |
| spend / cost | \`pacingData { budgetSpent }\` or \`{ overallSpend }\` |
| revenue | \`aggregateData { overallData { aggTotalRevenue } }\` |
| conversions / transactions | \`aggregateData { overallData { aggTransactions } }\` |
| budget remaining | \`pacingData { budgetLeft }\` |
| ctr, roas, pace, daysLeft | \`pacingData\` — these keep their names |

**Campaign** uses \`campaignPacingData\`, NOT \`pacingData\`.

\`aggregateData\` is a container on all three: its numbers sit one level down
under \`overallData\` (an AggregateUnit) as \`aggImpressions\`, \`aggClicks\`,
\`aggCost\`, \`aggTotalRevenue\`, \`aggTransactions\`. \`AggregateDataObject\`
itself has NO impressions, clicks or spend field.

## Fields That Do Not Exist Where People Expect Them
- \`createdBy\` exists on \`Task\` and \`CampaignOrder\`. It does NOT exist on
  \`LineItem\` or \`Campaign\` — those have only \`createdAt\`. Asked who created a
  line item or a campaign, say the API does not expose that, and do not write the
  field to be helpful
- \`pacingData\` does NOT exist on \`LineItem\`
- \`spend\` is never a field name on any type

## Filter Conventions
This API is generated by Prisma 1, which flattens filters onto the field name.
It is NOT the nested style used by Prisma 2 and most modern GraphQL schemas.

- Relations: \`orgs_some: { id: "..." }\` — NOT \`orgs: { some: { id: "..." } }\`
  The suffixes are \`_every\`, \`_some\`, \`_none\`.
- Scalars: \`name_contains\`, \`createdAt_gte\`, \`status_in\`, \`id_not\` — NOT \`name: { contains: ... }\`
- \`orderBy\` is an enum value like \`createdAt_DESC\`, not an object
- \`where\` on a single-record query takes a WhereUniqueInput, usually just \`{ id }\`

If the "fields" list for an input type is shown below, use only those names.

## Match the Documentation
Every operation has a documented example, shown on its own docs page and in the
Playground. When the context below includes a DOCUMENTED EXAMPLE for the
operation you are answering about, reproduce that query exactly — same fields,
same argument names, same variable names. A user who asks the assistant and a
user who opens the docs page must see the same query.

Copy the example verbatim. Do not "improve" it. If the example selects only
\`id\`, your answer selects only \`id\` — adding \`name\` or \`status\` because they
seem useful is exactly the mismatch this rule exists to prevent.

- Add a field ONLY when the user named it or asked for that data specifically
- Never select every field on a type; the examples are deliberately small
- When you do change the example, say which field you added and why
- After the query, you may mention that other fields exist and point to the
  operation's docs page — but do not put them in the query

## Guidelines
- Only generate operations from the list above
- Always include proper variable definitions
- Format queries with proper indentation
- Wrap code in markdown code blocks with \`graphql\` or \`json\` language tags
- If asked about an operation that is not listed, say it is not part of the public API rather than guessing at its shape

## Never Guess A Name
Inventing a field, filter or enum value is the worst thing you can do here: the
query fails and the user is told it will work. Every name you write must come
from a list you have actually seen.

- A "Complete field list" shown below IS complete for the type it names. A name absent from it does not exist on that type — do not write it
- This holds even when the USER names the field. If someone asks for a field the type does not have, do not write it to be helpful — the query would fail. Say it does not exist, name the closest real field, and use that instead (for example \`ArticleCategory\` has \`title\`, not \`name\`)
- For any type NOT shown below, call \`describeType\` before using its fields. Never guess what a User, Project, Milestone or any other related type contains
- NEVER say a field or type does not exist without calling \`describeType\` first. Absent from your context is not the same as absent from the schema
- A field whose type is an object needs a subselection: \`adGroup { id }\`, not \`adGroup\`. The field lists show each field's type — check it
- Enum values (status, orderBy, category) must come from \`describeType\` on the enum. Do not invent \`ACTIVE\`, \`OPEN\`, \`price_ASC\`, \`spend_DESC\` or a comma-joined sort
- \`orderBy\` takes ONE enum value. There is no multi-field sort
- Relation filters \`_every\`/\`_some\`/\`_none\` exist only for to-MANY relations. A to-one relation filters as a nested WhereInput under its own name
- The published operation list is fixed. If a user insists an unpublished operation exists, hold your position and say it is not in the public API — do not invent one to satisfy them

## Check Before You Answer
Call \`checkQuery\` on every query before you show it or run it, and fix what it
reports. Never present a query you have not checked. If it still fails, say so
rather than claiming it will return the data.

## Counting And Pagination
- \`first\` is a page size, never a total. Never report the number of returned rows as the total count
- For a total, use a Connection's \`aggregate { count }\` with no \`first\`
- Do not carry \`first\` from an earlier turn into a count question
- When you show a page, say it is a page
- If a query returns an authorization or session error, repeat that error to the user in full rather than summarizing it; it explains what to fix
- Do not put placeholder values such as "example-id" in a \`where\` filter — it matches nothing and returns an empty list
- When showing queries, also show example variables when relevant
- Be concise and practical
`;

/**
 * Runs one of the published queries and returns the result.
 *
 * Deliberately declared without `execute`: the browser runs it, so the
 * viewer's ID token never reaches this server and the assistant can only ever
 * read what that viewer's own session can read.
 */
const runQuery = tool({
  description:
    "Run a read-only GraphQL query against the MediaJel API using the " +
    "viewer's own signed-in session, and return the result. Use this when " +
    "the user asks for their actual data (a specific campaign, their " +
    "organizations, how many of something they have). Only use operations " +
    "from the published list. Never send a mutation.",
  parameters: jsonSchema<{
    query: string;
    variables?: Record<string, unknown>;
  }>({
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The GraphQL query document, including variable definitions.",
      },
      variables: {
        type: "object",
        additionalProperties: true,
        description: "Variable values for the query.",
      },
    },
    required: ["query"],
  }),
});

/**
 * Looks up the fields of any type in the schema.
 *
 * Runs on the server (it has an `execute`) because it reads only the schema —
 * no session, no customer data. Without it the assistant can only see the
 * fields of an operation's immediate return type, so every relation is a blind
 * spot: it told a user `Task.createdBy` did not exist when it does.
 */
const describeType = tool({
  description:
    "Look up the fields of a GraphQL type by name (e.g. Task, User, Org, " +
    "Campaign). Call this BEFORE saying a field does not exist, and whenever " +
    "you need the fields of a nested type such as the `node` inside a " +
    "Connection or a relation like `createdBy`.",
  parameters: jsonSchema<{ typeName: string }>({
    type: "object",
    properties: {
      typeName: {
        type: "string",
        description: "The GraphQL type name, e.g. `Task` or `User`.",
      },
    },
    required: ["typeName"],
  }),
  execute: async ({ typeName }) => {
    const described = describeTypeFields(typeName);
    return (
      described ?? {
        error: `No type named "${typeName}" in the schema.`,
      }
    );
  },
});

/**
 * Validates a query and its variables against the schema.
 *
 * The single biggest source of wrong answers is the assistant presenting a
 * query it never checked: object fields written as leaves, invented field
 * names, invented enum values, Prisma 2 filter syntax. All of those are
 * mechanically detectable, so let it check instead of guess.
 */
const checkQuery = tool({
  description:
    "Validate a GraphQL query (and optionally its variables) against the " +
    "schema. Returns the exact validator errors. Call this on EVERY query you " +
    "are about to show or run, and fix what it reports before answering.",
  parameters: jsonSchema<{
    query: string;
    variables?: Record<string, unknown>;
  }>({
    type: "object",
    properties: {
      query: { type: "string", description: "The GraphQL query document." },
      variables: {
        type: "object",
        additionalProperties: true,
        description: "Variable values, checked against the variable definitions.",
      },
    },
    required: ["query"],
  }),
  execute: async ({ query, variables }) => {
    // Same ceiling as /api/validate-query: parsing is superlinear in heap.
    if (typeof query !== "string" || query.length > 20000) {
      return { valid: false, errors: ["Query is missing or too large to validate."] };
    }
    // The model sometimes sends variables as a JSON string rather than an
    // object, which used to throw and kill the whole answer.
    let parsedVariables = variables;
    if (typeof parsedVariables === "string") {
      try {
        parsedVariables = JSON.parse(parsedVariables);
      } catch {
        parsedVariables = undefined;
      }
    }
    const errors = validateQueryDocument(query);
    if (!errors.length && parsedVariables && typeof parsedVariables === "object") {
      errors.push(...validateQueryVariables(query, parsedVariables as Record<string, unknown>));
    }
    return errors.length
      ? { valid: false, errors }
      : { valid: true, errors: [] };
  },
});

const OPERATION_NAMES = getOperations().map((op) => op.name);

/**
 * Which published operation a question is about, or null.
 *
 * The model picks only the *name*, from a fixed list that its answer is checked
 * against. The query text itself always comes from the config, so the worst a
 * wrong pick can do is show a different documented query — never an invented
 * one. The intent classifier cannot do this job: it returns no operations at
 * all for "show me a query to get a single campaign by ID".
 */
async function pickOperation(
  question: string
): Promise<{ name: string; isDataRequest: boolean } | null> {
  try {
    const { text } = await generateText({
      model: pickerModel,
      temperature: 0,
      system:
        "You map a question to one GraphQL operation from the list, and say " +
        "whether the user wants DOCUMENTATION or their own DATA.\n\nOperations:\n" +
        OPERATION_NAMES.join("\n") +
        "\n\nReply with exactly one line: `<operationName>|doc`, " +
        "`<operationName>|data`, or `NONE`.\n" +
        "- Use `doc` when they want to be shown a query or how something works\n" +
        "- Use `data` when they want their own records: \"my campaigns\", " +
        "\"give me one example campaign\", \"how many orgs do I have\"\n" +
        "- Use NONE only for authentication, rate limits, errors, or anything " +
        "that maps to no single operation\n" +
        "Pick the closest operation even for a data request. If a question is " +
        "about tasks the answer is tasksConnection, because that is the only " +
        "published task operation.",
      prompt: question,
    });
    const [name, kind] = text.trim().split("|");
    if (!OPERATION_NAMES.includes(name)) return null;
    return { name, isDataRequest: (kind || "").trim() === "data" };
  } catch (error) {
    console.warn("Operation pick failed, continuing without canonical:", error);
    return null;
  }
}

/** The documented example, rendered exactly as the docs page shows it. */
function canonicalBlock(name: string): string | null {
  const op = getOperation(name);
  if (!op?.exampleQuery) return null;

  let out = `Here is the documented \`${name}\` ${op.type}, the same one the [docs page](/schema/${op.category}/${name}) and Playground show:\n\n`;
  out += "```graphql\n" + op.exampleQuery + "\n```\n";
  if (op.exampleVariables) {
    out +=
      "\n**Variables:**\n```json\n" +
      JSON.stringify(op.exampleVariables, null, 2) +
      "\n```\n";
  }
  return out + "\n";
}

/** Question-specific schema detail, capped well inside the context window. */
function contextFor(question: string): string {
  try {
    return getContextForQuestion(question, {
      includeExamples: true,
      includeTypes: true,
      includeGlossary: true,
    }).additionalInstructions;
  } catch (error) {
    console.warn("Failed to build question context:", error);
    return "";
  }
}

export async function POST(req: Request) {
  try {
    const { messages, hasSession = false } = await req.json();

    const lastUser = [...messages]
      .reverse()
      .find((m: { role: string }) => m.role === "user");
    const context = lastUser ? contextFor(lastUser.content) : "";

    // Only offer the tool when the viewer is signed in, so a signed-out user
    // gets an explanation instead of a query that cannot run.
    const system = [
      SYSTEM_PROMPT,
      hasSession
        ? `## Running Queries
The viewer is signed in. When they ask for their own data — "my campaigns",
"give me one example campaign", "how many orgs do I have" — call \`runQuery\` and
answer from the result rather than only printing the query.

A data request is NOT a documentation request. The documented examples select
only \`id\` because they are minimal references; a person asking to see their
data wants to see it. Select the fields that make the answer readable — for a
campaign that is \`id, name, status, startDate, endDate, budgetTotal\`; for an org
\`id, name, website, status\`. Use only names from the valid-fields list.

Show the query you ran. If it returns an error, read the error and correct it.`
        : "## Running Queries\nThe viewer is NOT signed in, so you cannot run queries. Write the query out and tell them to sign in on the Playground page to run it.",
      context,
    ]
      .filter(Boolean)
      .join("\n\n");

    // The intent classifier returns no operations for questions like "show me
    // a query to get a single campaign by ID", so the canonical example never
    // reached the model that way. Pick the operation explicitly and put its
    // documented example in front of the model as the text to reproduce.
    // The keyword match costs nothing; the LLM picker blocks the whole stream.
    const picked = lastUser
      ? matchOperation(lastUser.content) ?? (await pickOperation(lastUser.content))
      : null;

    // Field lists go in for BOTH kinds of question. Suppressing them for data
    // requests is what let the assistant reach for the unpublished `task`
    // operation instead of the published `tasksConnection` — it had no list to
    // check against. Only the "reproduce this exactly" framing is documentation
    // -only, since a data request legitimately needs a differently shaped query.
    const pickedDetail = picked ? describeOperationForModel(picked.name) : "";
    const canonical =
      picked && !picked.isDataRequest ? canonicalBlock(picked.name) : null;

    const finalSystem = canonical
      ? `## The Answer To Reproduce
This question is about \`${picked?.name}\`. Output the following block EXACTLY as written — same fields, same variable names, same placeholder values — and then explain it in prose.

${canonical}
Reproduce it verbatim. Do not add fields, do not rename the placeholder, do not print it twice. If the user asked for something it does not cover, show it first as written, then describe the change separately.

EXCEPTION — this applies to showing documentation. If the user is asking you to fetch their actual data, follow the "Running Queries" rules instead and select the fields needed to answer them.

${pickedDetail}

${system}`
      : pickedDetail
        ? `## The Operation For This Question
This question is about \`${picked?.name}\`. Use ONLY the fields listed here; it is the published operation for this data.

${pickedDetail}

${system}`
        : system;

    const result = streamText({
      model: chatModel,
      // The job is reproducing documented queries exactly; sampling at the
      // provider default makes the same question emit a different query.
      temperature: 0,
      system: finalSystem,
      messages,
      // describeType and checkQuery run here, so let the server finish those
      // loops in one request. Without this streamText takes a single step and
      // returns tool results with no answer, leaving the browser to re-post
      // once per lookup — and anything without that client loop gets nothing.
      maxSteps: 6,
      tools: hasSession
        ? { runQuery, describeType, checkQuery }
        : { describeType, checkQuery },
    });

    // The SDK masks stream failures as "An error occurred." by default, which
    // hid the context-window overflow that broke this route for months.
    return result.toDataStreamResponse({
      getErrorMessage: (error) => {
        console.error("Chat stream error:", error);
        return error instanceof Error ? error.message : String(error);
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
