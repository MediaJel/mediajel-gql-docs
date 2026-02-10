/**
 * Schema Context Builder for Hybrid AI Architecture
 *
 * Builds relevant GraphQL schema context based on intent classification.
 * Uses existing schema.ts utilities to extract and format schema information.
 */

import {
  getOperations,
  getOperation,
  getAllTypes,
  getConfig,
  OperationInfo,
  TypeDetails,
} from "./schema";
import { ClassifiedIntent, QueryIntent } from "./intent-classifier";
import {
  GlossaryMatch,
  formatGlossaryAsMarkdown,
  GlossaryEntry,
} from "./domain-glossary";

/**
 * Maximum tokens for context (approximate, using character estimate)
 * ~4 chars per token, targeting ~8000 tokens max
 */
const MAX_CONTEXT_CHARS = 32000;

/**
 * Options for building schema context
 */
export interface SchemaContextOptions {
  /** Maximum characters for the context */
  maxChars?: number;
  /** Include example queries */
  includeExamples?: boolean;
  /** Include type details */
  includeTypes?: boolean;
  /** Include glossary context */
  includeGlossary?: boolean;
}

/**
 * Result of building schema context
 */
export interface SchemaContext {
  /** The formatted context string */
  context: string;
  /** Operations included in the context */
  includedOperations: string[];
  /** Types included in the context */
  includedTypes: string[];
  /** Glossary terms included */
  includedTerms: string[];
  /** Approximate character count */
  characterCount: number;
  /** Whether context was truncated */
  wasTruncated: boolean;
}

/**
 * Format a single operation as markdown
 */
function formatOperation(op: OperationInfo, includeExample: boolean): string {
  let markdown = `### ${op.name}\n`;
  markdown += `**Type:** ${op.type}\n`;
  markdown += `**Category:** ${op.category}\n`;
  markdown += `${op.description}\n\n`;

  // Arguments
  if (op.args.length > 0) {
    markdown += "**Arguments:**\n";
    for (const arg of op.args) {
      const required = arg.required ? " (required)" : "";
      markdown += `- \`${arg.name}\`: ${arg.type}${required}`;
      if (arg.description) {
        markdown += ` - ${arg.description}`;
      }
      markdown += "\n";
    }
    markdown += "\n";
  }

  // Return type
  markdown += `**Returns:** \`${op.returnType}\`\n`;

  // Example query
  if (includeExample && op.exampleQuery) {
    markdown += "\n**Example:**\n";
    markdown += "```graphql\n" + op.exampleQuery + "\n```\n";
    if (op.exampleVariables) {
      markdown += "\n**Variables:**\n";
      markdown += "```json\n" + JSON.stringify(op.exampleVariables, null, 2) + "\n```\n";
    }
  }

  markdown += "\n";
  return markdown;
}

/**
 * Format a type definition as markdown
 */
function formatType(type: TypeDetails): string {
  let markdown = `### ${type.name}\n`;
  markdown += `**Kind:** ${type.kind}\n\n`;

  if (type.kind === "ENUM" && type.enumValues) {
    markdown += "**Values:**\n";
    for (const value of type.enumValues) {
      markdown += `- \`${value}\`\n`;
    }
  } else if (type.fields && type.fields.length > 0) {
    markdown += "**Fields:**\n";
    for (const field of type.fields.slice(0, 20)) {
      // Limit to 20 fields
      markdown += `- \`${field.name}\`: ${field.type}`;
      if (field.description) {
        markdown += ` - ${field.description}`;
      }
      markdown += "\n";
    }
    if (type.fields.length > 20) {
      markdown += `- ... and ${type.fields.length - 20} more fields\n`;
    }
  }

  markdown += "\n";
  return markdown;
}

/**
 * Get operations by names
 */
function getOperationsByNames(names: string[]): OperationInfo[] {
  const allOps = getOperations();
  const nameSet = new Set(names.map((n) => n.toLowerCase()));
  return allOps.filter((op) => nameSet.has(op.name.toLowerCase()));
}

/**
 * Get types by names
 */
function getTypesByNames(names: string[]): TypeDetails[] {
  const allTypes = getAllTypes();
  const nameSet = new Set(names.map((n) => n.toLowerCase()));
  return allTypes.filter((t) => nameSet.has(t.name.toLowerCase()));
}

/**
 * Build context for SCHEMA_QUERY intent
 * Provides broad schema overview with common operations
 */
function buildSchemaQueryContext(
  options: SchemaContextOptions
): SchemaContext {
  const maxChars = options.maxChars || MAX_CONTEXT_CHARS;
  const allOps = getOperations();
  const config = getConfig();

  let context = "## MediaJel GraphQL API Reference\n\n";
  context += `${config.description}\n\n`;
  context += `**Base URL:** ${config.baseUrl}\n`;
  context += `**Rate Limit:** ${config.rateLimits.requestsPerMinute} requests per minute\n\n`;

  // Authentication info
  context += "### Authentication\n";
  context += "1. Authenticate via `authSignIn` mutation with username and password\n";
  context += "2. Use returned `accessToken` in `Authorization: Bearer <token>` header\n";
  context += "3. Include organization ID in `Key` header\n\n";

  // List available operations by category
  context += "### Available Operations\n\n";

  const opsByCategory: Record<string, OperationInfo[]> = {};
  for (const op of allOps) {
    const cat = op.category || "other";
    if (!opsByCategory[cat]) {
      opsByCategory[cat] = [];
    }
    opsByCategory[cat].push(op);
  }

  const includedOperations: string[] = [];

  for (const category of Object.keys(opsByCategory)) {
    const ops = opsByCategory[category];
    context += `**${category}:** ${ops.map((o: OperationInfo) => o.name).join(", ")}\n`;
    includedOperations.push(...ops.map((o: OperationInfo) => o.name));
  }

  context += "\n";

  // Add a few common operation examples
  const commonOps = ["authSignIn", "campaigns", "campaignsConnection", "orgs"];
  context += "### Common Operations\n\n";

  for (const opName of commonOps) {
    const op = getOperation(opName);
    if (op && context.length < maxChars - 2000) {
      context += formatOperation(op, options.includeExamples !== false);
    }
  }

  return {
    context,
    includedOperations,
    includedTypes: [],
    includedTerms: [],
    characterCount: context.length,
    wasTruncated: context.length >= maxChars,
  };
}

/**
 * Build context for HYBRID intent
 * Combines glossary context with relevant schema details
 */
function buildHybridContext(
  classification: ClassifiedIntent,
  options: SchemaContextOptions
): SchemaContext {
  const maxChars = options.maxChars || MAX_CONTEXT_CHARS;
  const includedOperations: string[] = [];
  const includedTypes: string[] = [];
  const includedTerms: string[] = [];

  let context = "## Context for Your Question\n\n";

  // Add glossary context first
  if (
    options.includeGlossary !== false &&
    classification.glossaryMatches.length > 0
  ) {
    const entries = classification.glossaryMatches.map((m) => m.entry);
    context += formatGlossaryAsMarkdown(entries);
    includedTerms.push(...entries.map((e) => e.term));
  }

  // Add relevant operations
  if (classification.suggestedOperations.length > 0) {
    context += "## Relevant GraphQL Operations\n\n";

    const ops = getOperationsByNames(classification.suggestedOperations);
    for (const op of ops) {
      if (context.length < maxChars - 2000) {
        context += formatOperation(op, options.includeExamples !== false);
        includedOperations.push(op.name);
      }
    }
  }

  // Add relevant types
  if (options.includeTypes !== false && classification.suggestedTypes.length > 0) {
    const types = getTypesByNames(classification.suggestedTypes);
    if (types.length > 0 && context.length < maxChars - 1500) {
      context += "## Related Types\n\n";
      for (const type of types) {
        if (context.length < maxChars - 500) {
          context += formatType(type);
          includedTypes.push(type.name);
        }
      }
    }
  }

  return {
    context,
    includedOperations,
    includedTypes,
    includedTerms,
    characterCount: context.length,
    wasTruncated: context.length >= maxChars,
  };
}

/**
 * Build minimal context for DOMAIN_KNOWLEDGE intent
 * Just provides basic API info since RAG will handle the main answer
 */
function buildDomainKnowledgeContext(): SchemaContext {
  const config = getConfig();

  let context = "## API Reference (if needed)\n\n";
  context += `The MediaJel GraphQL API is available at ${config.baseUrl}.\n`;
  context += "If the user asks follow-up questions about the API, ";
  context += "you can provide GraphQL query examples.\n\n";

  return {
    context,
    includedOperations: [],
    includedTypes: [],
    includedTerms: [],
    characterCount: context.length,
    wasTruncated: false,
  };
}

/**
 * Build minimal context for GENERAL intent
 */
function buildGeneralContext(): SchemaContext {
  return {
    context: "",
    includedOperations: [],
    includedTypes: [],
    includedTerms: [],
    characterCount: 0,
    wasTruncated: false,
  };
}

/**
 * Build relevant context based on intent classification
 *
 * @param classification - The classified intent from the intent classifier
 * @param options - Options for context building
 * @returns SchemaContext with formatted context and metadata
 */
export function buildRelevantContext(
  classification: ClassifiedIntent,
  options: SchemaContextOptions = {}
): SchemaContext {
  switch (classification.intent) {
    case "SCHEMA_QUERY":
      return buildSchemaQueryContext(options);

    case "HYBRID":
      return buildHybridContext(classification, options);

    case "DOMAIN_KNOWLEDGE":
      return buildDomainKnowledgeContext();

    case "GENERAL":
    default:
      return buildGeneralContext();
  }
}

/**
 * Build additional instructions for the OpenAI assistant based on classification
 */
export function buildAdditionalInstructions(
  classification: ClassifiedIntent,
  schemaContext: SchemaContext
): string {
  let instructions = "";

  // Add classification context
  instructions += `## Question Classification\n`;
  instructions += `**Intent:** ${classification.intent}\n`;
  instructions += `**Confidence:** ${(classification.confidence * 100).toFixed(0)}%\n`;
  instructions += `**Reasoning:** ${classification.reasoning}\n\n`;

  // Add intent-specific guidance
  switch (classification.intent) {
    case "SCHEMA_QUERY":
      instructions += `## Guidance\n`;
      instructions += `This is a direct API/schema question. Provide accurate GraphQL information.\n`;
      instructions += `- Use the schema context below to answer\n`;
      instructions += `- Include working query examples with proper syntax\n`;
      instructions += `- Explain arguments and return types when relevant\n\n`;
      break;

    case "HYBRID":
      instructions += `## Guidance\n`;
      instructions += `This is a business question that maps to specific API operations.\n`;
      instructions += `- Translate the business terms to technical GraphQL queries\n`;
      instructions += `- Use the glossary mappings provided below\n`;
      instructions += `- Provide complete, working queries that answer the business question\n`;
      instructions += `- Explain what the query does in business terms\n\n`;
      break;

    case "DOMAIN_KNOWLEDGE":
      instructions += `## Guidance\n`;
      instructions += `This is a company/product question. Use the knowledge base (file_search) primarily.\n`;
      instructions += `- Search the knowledge base for relevant information\n`;
      instructions += `- Cite sources when available\n`;
      instructions += `- Only include API details if directly relevant\n\n`;
      break;

    case "GENERAL":
      instructions += `## Guidance\n`;
      instructions += `Answer this question using your general knowledge.\n`;
      instructions += `- If unsure about MediaJel-specific information, search the knowledge base\n`;
      instructions += `- Be helpful and concise\n\n`;
      break;
  }

  // Add the schema context
  if (schemaContext.context) {
    instructions += schemaContext.context;
  }

  // Add matched terms summary for HYBRID
  if (classification.intent === "HYBRID" && schemaContext.includedTerms.length > 0) {
    instructions += `\n## Matched Business Terms\n`;
    instructions += schemaContext.includedTerms.join(", ") + "\n\n";
  }

  // Add operations summary
  if (schemaContext.includedOperations.length > 0) {
    instructions += `\n## Included Operations\n`;
    instructions += schemaContext.includedOperations.join(", ") + "\n\n";
  }

  return instructions;
}

/**
 * Quick helper to get context for a question
 * Combines classification and context building
 */
export function getContextForQuestion(
  question: string,
  options: SchemaContextOptions = {}
): {
  classification: ClassifiedIntent;
  schemaContext: SchemaContext;
  additionalInstructions: string;
} {
  // Import here to avoid circular dependency
  const { classifyIntent } = require("./intent-classifier");
  const { loadGlossary } = require("./domain-glossary");

  const glossary = loadGlossary();
  const classification = classifyIntent(question, glossary);
  const schemaContext = buildRelevantContext(classification, options);
  const additionalInstructions = buildAdditionalInstructions(
    classification,
    schemaContext
  );

  return {
    classification,
    schemaContext,
    additionalInstructions,
  };
}
