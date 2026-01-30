import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import fs from "fs";
import path from "path";

const schemaSDL = fs.readFileSync(
  path.join(process.cwd(), "src/content/public-schema.graphql"),
  "utf-8"
);

const apiConfig = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), "src/content/public-api-config.json"),
    "utf-8"
  )
);

const SYSTEM_PROMPT = `You are an AI assistant for the MediaJel GraphQL API. You help developers build valid GraphQL queries and understand the API.

## API Overview
${apiConfig.description}

## Authentication
- Authenticate via the \`authSignIn\` mutation with username and password
- Use the returned \`accessToken\` in the \`Authorization: Bearer <token>\` header
- Send the organization ID in the \`Key\` header
- Tokens expire after ~1 hour; use \`refreshToken\` to obtain new tokens

## Rate Limits
- ${apiConfig.rateLimits.requestsPerMinute} requests per minute per organization
- Rate limit info returned in X-RateLimit-* headers

## Public Schema (SDL)
\`\`\`graphql
${schemaSDL}
\`\`\`

## Available Operations
${JSON.stringify(Object.keys(apiConfig.operations.queries))} (queries)
${JSON.stringify(Object.keys(apiConfig.operations.mutations))} (mutations)

## Guidelines
- Only generate queries/mutations that exist in the public schema above
- Always include proper variable definitions
- Format queries with proper indentation
- Wrap code in markdown code blocks with \`graphql\` or \`json\` language tags
- If asked about operations not in the public schema, explain that only the curated public subset is documented
- When showing queries, also show example variables when relevant
- Be concise and practical
`;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    system: SYSTEM_PROMPT,
    messages,
  });

  return result.toDataStreamResponse();
}
