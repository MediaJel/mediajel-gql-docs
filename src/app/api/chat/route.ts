import { openai as aiSdkOpenai } from "@ai-sdk/openai";
import { streamText } from "ai";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

// Import hybrid AI architecture modules
import { classifyIntent } from "@/lib/intent-classifier";
import {
  buildRelevantContext,
  buildAdditionalInstructions,
} from "@/lib/schema-context-builder";
import { loadGlossary, DomainGlossary } from "@/lib/domain-glossary";

// Load GraphQL schema for context
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

// Load domain glossary for intent classification
let domainGlossary: DomainGlossary;
try {
  domainGlossary = loadGlossary();
} catch (error) {
  console.warn("Failed to load domain glossary, using empty glossary:", error);
  domainGlossary = { version: "1.0.0", lastUpdated: "", terms: [] };
}

// System prompt for non-Assistant mode (fallback)
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

// Check if Assistants API is configured
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;
const openaiClient = ASSISTANT_ID ? new OpenAI() : null;

// Thread storage (in production, use Redis or database)
const threadStore = new Map<string, string>();

interface SourceCitation {
  title: string;
  url: string;
}

function extractCitations(
  content: string,
  annotations: OpenAI.Beta.Threads.Messages.Annotation[]
): { text: string; citations: SourceCitation[] } {
  const citations: SourceCitation[] = [];
  let modifiedContent = content;

  // Process file citations from file_search tool
  for (const annotation of annotations) {
    if (annotation.type === "file_citation") {
      const fileCitation = annotation.file_citation;
      // Replace citation marker with numbered reference
      const citationNumber = citations.length + 1;
      modifiedContent = modifiedContent.replace(
        annotation.text,
        `[${citationNumber}]`
      );

      // Try to extract URL from file metadata if available
      citations.push({
        title: `Source ${citationNumber}`,
        url: "#", // In production, map file_id to Notion URL
      });
    }
  }

  return { text: modifiedContent, citations };
}

// Helper to convert OpenAI stream to Vercel AI SDK compatible format
function streamAssistantResponse(
  stream: AsyncIterable<OpenAI.Beta.Assistants.AssistantStreamEvent>,
  threadId: string
): Response {
  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.event === "thread.message.delta") {
            const delta = event.data.delta;
            if (delta.content) {
              for (const block of delta.content) {
                if (block.type === "text" && block.text?.value) {
                  // Format as Vercel AI SDK data stream
                  const chunk = `0:${JSON.stringify(block.text.value)}\n`;
                  controller.enqueue(encoder.encode(chunk));
                }
              }
            }
          }

          if (event.event === "thread.message.completed") {
            const message = event.data;
            // Check for citations
            for (const block of message.content) {
              if (block.type === "text" && block.text.annotations.length > 0) {
                const { citations } = extractCitations(
                  block.text.value,
                  block.text.annotations
                );

                if (citations.length > 0) {
                  const citationText = `\n\n---\n**Sources:**\n${citations.map((c, i) => `${i + 1}. [${c.title}](${c.url})`).join("\n")}`;
                  const chunk = `0:${JSON.stringify(citationText)}\n`;
                  controller.enqueue(encoder.encode(chunk));
                }
              }
            }
          }

          if (event.event === "thread.run.completed") {
            // Send finish reason
            controller.enqueue(encoder.encode(`d:{"finishReason":"stop"}\n`));
          }

          if (event.event === "thread.run.failed") {
            const error = event.data.last_error?.message || "Run failed";
            controller.enqueue(
              encoder.encode(`3:${JSON.stringify(error)}\n`)
            );
          }
        }
      } catch (error) {
        console.error("Stream error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        controller.enqueue(
          encoder.encode(`3:${JSON.stringify(errorMessage)}\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Thread-Id": threadId,
    },
  });
}

// Assistant-based handler with streaming
async function handleAssistantRequest(
  messages: Array<{ role: string; content: string }>,
  threadId?: string
): Promise<Response> {
  if (!openaiClient || !ASSISTANT_ID) {
    throw new Error("Assistants API not configured");
  }

  // Get or create thread
  let thread: OpenAI.Beta.Threads.Thread;
  if (threadId && threadStore.has(threadId)) {
    const existingThreadId = threadStore.get(threadId)!;
    try {
      thread = await openaiClient.beta.threads.retrieve(existingThreadId);
    } catch {
      thread = await openaiClient.beta.threads.create();
      threadStore.set(threadId, thread.id);
    }
  } else {
    thread = await openaiClient.beta.threads.create();
    if (threadId) {
      threadStore.set(threadId, thread.id);
    }
  }

  // Add the latest user message
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role === "user") {
    // Use hybrid AI architecture: classify intent and build dynamic context
    const classification = classifyIntent(lastMessage.content, domainGlossary);
    const schemaContext = buildRelevantContext(classification, {
      includeExamples: true,
      includeTypes: true,
      includeGlossary: true,
    });

    // Add context hint to message for HYBRID and SCHEMA_QUERY intents
    let messageContent = lastMessage.content;
    if (
      classification.intent === "HYBRID" ||
      classification.intent === "SCHEMA_QUERY"
    ) {
      // Add a hint about the classification for context
      const operationsHint =
        classification.suggestedOperations.length > 0
          ? `Relevant operations: ${classification.suggestedOperations.join(", ")}`
          : "";
      if (operationsHint) {
        messageContent += `\n\n[${operationsHint}]`;
      }
    }

    await openaiClient.beta.threads.messages.create(thread.id, {
      role: "user",
      content: messageContent,
    });

    // Build dynamic additional instructions based on classification
    const dynamicInstructions = buildAdditionalInstructions(
      classification,
      schemaContext
    );

    // Create a run with streaming using dynamic context
    const stream = await openaiClient.beta.threads.runs.stream(thread.id, {
      assistant_id: ASSISTANT_ID,
      additional_instructions: dynamicInstructions,
    });

    // Convert OpenAI stream to Vercel AI SDK compatible format
    return streamAssistantResponse(stream, thread.id);
  }

  // Fallback for non-user messages (shouldn't happen normally)
  const stream = await openaiClient.beta.threads.runs.stream(thread.id, {
    assistant_id: ASSISTANT_ID,
  });

  return streamAssistantResponse(stream, thread.id);
}

// Legacy streaming handler
async function handleLegacyRequest(
  messages: Array<{ role: string; content: string }>
): Promise<Response> {
  const result = streamText({
    model: aiSdkOpenai("gpt-4o"),
    system: SYSTEM_PROMPT,
    messages: messages as any,
  });

  return result.toDataStreamResponse();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, threadId, useAssistant = true } = body;

    // Use Assistants API if configured and requested
    if (ASSISTANT_ID && openaiClient && useAssistant) {
      return handleAssistantRequest(messages, threadId);
    }

    // Fallback to legacy streaming
    return handleLegacyRequest(messages);
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
