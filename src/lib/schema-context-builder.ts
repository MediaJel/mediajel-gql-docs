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
  getSchema,
  describeTypeFields,
  OperationInfo,
  TypeDetails,
} from "./schema";
import { isInputObjectType, isEnumType, isObjectType, getNamedType } from "graphql";
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
/**
 * For `XConnection`, the entity reached through `edges { node }`.
 * Returns null for anything that is not a Relay-style connection.
 */
function connectionNodeType(
  typeName: string | undefined
): { name: string; fields: string[] } | null {
  if (!typeName?.endsWith("Connection")) return null;
  const edge = describeTypeFields(`${typeName.replace(/Connection$/, "")}Edge`);
  if (!edge) return null;
  const nodeField = edge.fields.find((f) => f.startsWith("node:"));
  if (!nodeField) return null;
  const node = describeTypeFields(nodeField.split(":")[1].trim());
  return node?.fields.length ? node : null;
}

/**
 * Renders a field as it must be written in a selection set.
 *
 * Showing `adGroup: LineItemAdGroup` still leaves the model to work out that
 * the type is an object and therefore needs braces — and it half does, getting
 * one field right and the next one wrong. Writing `adGroup { … }` puts the
 * requirement in the notation it is about to copy.
 */
function formatSelectableField(name: string, typeName: string): string {
  const bare = typeName.replace(/[![\]]/g, "");
  let type;
  try {
    type = getSchema().getType(bare);
  } catch {
    return name;
  }
  return type && isObjectType(type) ? `${name} { … }` : name;
}

/**
 * Budget for the nested-type expansion.
 *
 * Measured depth-2 worst case is ~23KB (Org). At 14KB the budget ran out on
 * CampaignOrder's 96 nested types before reaching AggregateUnit, so the model
 * still had to guess the very fields the expansion exists to supply. ~6.5k
 * tokens is not worth economising against a 128k window.
 */
const MAX_NESTED_CHARS = 26000;

/**
 * One level of the types reachable from `typeName`'s object fields.
 *
 * Telling the model to call `describeType` for a nested type does not reliably
 * happen — asked for `aggregateData` it invented `impressions, clicks,
 * conversions` on a type whose real fields are `overallData, byDate,
 * topCreatives`. Handing it the subselection targets up front removes the
 * opportunity to guess. Costs ~450–2700 tokens depending on the type.
 */
function expandNestedTypes(typeName: string | undefined): string {
  if (!typeName) return "";
  let root;
  try {
    root = getSchema().getType(typeName.replace(/[![\]]/g, ""));
  } catch {
    return "";
  }
  if (!root || !isObjectType(root)) return "";

  // Breadth-first to depth 2, so the closest types are described first and the
  // budget truncates the far ones. One level was not enough: given
  // `aggregateData` it correctly found `overallData` (depth 1) and then
  // invented `impressions, clicks, spend` on AggregateUnit (depth 2), whose
  // real fields are `aggImpressions, aggClicks, aggCost`.
  // Seed with the root so a self-reference (Campaign.orgs -> Org.campaigns)
  // cannot re-list the type whose fields are already printed above.
  const seen = new Set<string>([root.name]);
  const ordered: string[] = [];
  let frontier = [root.name];
  for (let depth = 0; depth < 2; depth++) {
    const next: string[] = [];
    for (const current of frontier) {
      const type = getSchema().getType(current);
      if (!type || !isObjectType(type)) continue;
      for (const field of Object.values(type.getFields())) {
        const described = describeTypeFields(String(field.type));
        if (described?.kind !== "OBJECT" || seen.has(described.name)) continue;
        seen.add(described.name);
        ordered.push(described.name);
        next.push(described.name);
      }
    }
    frontier = next;
  }
  if (!ordered.length) return "";

  const lines: string[] = [];
  let used = 0;
  let dropped = 0;
  for (const name of ordered) {
    const described = describeTypeFields(name);
    if (!described?.fields.length) continue;
    const line = `- \`${name}\`: ${described.fields
      .map((f) => {
        const [fieldName, fieldType] = f.split(":");
        return formatSelectableField(fieldName.trim(), (fieldType || "").trim());
      })
      .join(", ")}`;
    if (used + line.length > MAX_NESTED_CHARS) {
      dropped++;
      continue;
    }
    used += line.length;
    lines.push(line);
  }
  if (!lines.length) return "";

  let markdown = `\n**Fields of the nested types above** — use these for subselections instead of guessing:\n`;
  markdown += lines.join("\n") + "\n";
  if (dropped) {
    markdown += `(${dropped} more nested type(s) omitted for length — call \`describeType\` for those.)\n`;
  }
  return markdown;
}

/** Prisma 1 flattens filter operators onto the field name. */
const FILTER_SUFFIXES = [
  "not_starts_with",
  "not_ends_with",
  "not_contains",
  "starts_with",
  "ends_with",
  "not_in",
  "contains",
  "not",
  "in",
  "lte",
  "lt",
  "gte",
  "gt",
];

/**
 * A compact shape for a `where` / `orderBy` argument.
 *
 * This backend is Prisma 1, so filters are flattened (`orgs_some`) rather than
 * nested the way Prisma 2 and most modern schemas do it (`orgs: { some: … }`).
 * Without seeing the input type the model writes the modern form and the API
 * rejects it. Listing all 274 CampaignWhereInput fields would blow the budget,
 * so operator variants are collapsed back to their base field.
 */
const MAX_ENUMS_SHOWN = 12;

function summarizeArgType(typeName: string): string {
  const bare = typeName.replace(/[![\]]/g, "");
  let type;
  try {
    type = getSchema().getType(bare);
  } catch {
    return "";
  }
  if (!type) return "";

  if (isEnumType(type)) {
    const values = type.getValues().map((v) => v.name);
    const shown = values.slice(0, 40).join(", ");
    return `**\`${bare}\` values:** ${shown}${
      values.length > 40 ? `, …(${values.length} total)` : ""
    }\n`;
  }

  if (!isInputObjectType(type)) return "";

  const fields = type.getFields();
  const names = Object.keys(fields);
  const relations: string[] = [];
  const scalars = new Set<string>();
  const enums = new Map<string, string[]>();

  for (const name of names) {
    const relation = name.match(/^(.*)_(every|some|none)$/);
    if (relation) {
      relations.push(name);
      continue;
    }
    const suffix = FILTER_SUFFIXES.find((s) => name.endsWith(`_${s}`));
    scalars.add(suffix ? name.slice(0, -(suffix.length + 1)) : name);

    // Without the allowed values the model invents them (EDIBLES for EDIBLE).
    const named = getNamedType(fields[name].type);
    if (isEnumType(named) && !enums.has(named.name)) {
      enums.set(
        named.name,
        named.getValues().map((v) => v.name)
      );
    }
  }

  // The operator note belongs on filters only; it is nonsense on an auth input.
  const isFilter = /WhereInput|WhereUniqueInput/.test(bare);
  let markdown = isFilter
    ? `**\`${bare}\` fields** (Prisma 1 style — operators are suffixes on the field name, e.g. \`name_contains\`, \`createdAt_gte\`):\n`
    : `**\`${bare}\` fields** — these are the only accepted keys:\n`;
  markdown += Array.from(scalars).join(", ") + "\n";
  if (relations.length) {
    markdown += `Relation filters (take a nested WhereInput): ${relations.join(", ")}\n`;
  }
  for (const [name, values] of Array.from(enums).slice(0, MAX_ENUMS_SHOWN)) {
    const shown = values.slice(0, 40).join(", ");
    markdown += `\`${name}\` values: ${shown}${
      values.length > 40 ? `, …(${values.length} total)` : ""
    }\n`;
  }
  return markdown;
}

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

    // Spell out every input object, not just filters. Without the field list
    // for AuthSignInInput the model writes `email` for what is `username`.
    for (const arg of op.args) {
      const summary = summarizeArgType(arg.type);
      if (summary) markdown += summary + "\n";
    }
  }

  markdown += `**Returns:** \`${op.returnType}\`\n\n`;

  // The example the docs page for this operation renders, from the same
  // validated source. Show it first and label it canonical so the assistant
  // reproduces it instead of composing a different query for the same question.
  if (includeExample && op.exampleQuery) {
    markdown += `**DOCUMENTED EXAMPLE — reproduce this exactly.** It is what the \`${op.name}\` docs page shows, and it is verified to run.\n`;
    markdown += "```graphql\n" + op.exampleQuery + "\n```\n";
    if (op.exampleVariables) {
      markdown += "\n**Variables:**\n";
      markdown += "```json\n" + JSON.stringify(op.exampleVariables, null, 2) + "\n```\n";
    }
  }

  // A reference for checking names, not a menu. Given the full list the model
  // will otherwise select every field; given only the type name it invents
  // plausible ones (`budget` for `budgetTotal`, `organization` for `orgs`).
  // Types are listed, not just names: without them the model cannot tell a
  // scalar from an object and writes object fields as leaves, which is invalid
  // GraphQL (`adGroup` instead of `adGroup { id }`).
  const returnFields = op.returnTypeDetails?.fields;
  if (returnFields?.length) {
    markdown += `\n**Complete field list for \`${op.returnTypeDetails.name}\`** — this is every field the type has. Do NOT select them all; add a field to the example above only if the user asked for it. Anything not listed here does not exist on this type:\n`;
    markdown += returnFields
      .map((f) => formatSelectableField(f.name, f.type))
      .join(", ");
    markdown += "\nFields shown with `{ … }` are object types and MUST have a subselection; the rest are scalars or enums and must not.\n";
    // For a Connection this would walk edges -> node -> the entity and repeat
    // almost everything the node expansion below emits. Let the node section
    // own it; every token here is paid for on every request.
    if (!connectionNodeType(op.returnTypeDetails?.name)) {
      markdown += expandNestedTypes(op.returnTypeDetails?.name);
    }
  }

  // A Connection type's own fields are just pageInfo/edges/aggregate, which
  // says nothing about the records inside it. Five published operations return
  // one, and `tasksConnection` is the ONLY way to reach a Task — so without
  // this the assistant cannot see a single task field and wrongly reports that
  // real ones (`createdBy`) do not exist.
  const nodeType = connectionNodeType(op.returnTypeDetails?.name);
  if (nodeType) {
    markdown += `\nThis is a Connection: the records are at \`edges { node { … } }\`, and the total is at \`aggregate { count }\`.\n`;
    markdown += `**Complete field list for \`${nodeType.name}\`** (the node) — every field it has; anything not listed does not exist on it:\n`;
    markdown += nodeType.fields
      .map((f) => {
        const [name, type] = f.split(":");
        return formatSelectableField(name.trim(), (type || "").trim());
      })
      .join(", ");
    markdown += "\nFields shown with `{ … }` are object types and MUST have a subselection; the rest are scalars or enums and must not.\n";
    markdown += expandNestedTypes(nodeType.name);
  }

  markdown += "\n";
  return markdown;
}

/**
 * Full detail for one operation: arguments, filter shapes, the documented
 * example, the complete field list, and the nested types it can select into.
 *
 * The intent classifier only ever details four hardcoded "common operations",
 * so a question about any of the other 29 arrived with no field list at all —
 * which is why the assistant wrote `name` on ArticleCategory (the field is
 * `title`). The operation actually being asked about must be described.
 */
export function describeOperationForModel(name: string): string {
  const op = getOperation(name);
  return op ? formatOperation(op, true) : "";
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
  const baseUrl = process.env.NEXT_PUBLIC_GQL_ENDPOINT || config.baseUrl;

  let context = "## MediaJel GraphQL API Reference\n\n";
  context += `${config.description}\n\n`;
  context += `**Base URL:** ${baseUrl}\n`;
  context += `**Rate Limit:** ${config.rateLimits.requestsPerMinute} requests per minute\n\n`;

  // Authentication info
  context += "### Authentication\n";
  context += "1. Authenticate via `authSignIn` mutation with username and password\n";
  context += "2. Use returned `idToken` in `Authorization: Bearer <token>` header (the access token is rejected)\n";
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
    const ops = getOperationsByNames(classification.suggestedOperations);

    if (ops.length === 0) {
      // The glossary still maps this topic to operations the public API does not
      // expose. Say so, rather than leaving an empty heading the model fills in
      // by inventing operation names.
      context += "## Availability\n\n";
      context +=
        "This topic has no operations in the public API. Tell the user it is " +
        "not available through the API and do not suggest a query for it.\n\n";
    } else {
      context += "## Relevant GraphQL Operations\n\n";
      for (const op of ops) {
        if (context.length < maxChars - 2000) {
          context += formatOperation(op, options.includeExamples !== false);
          includedOperations.push(op.name);
        }
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
  const baseUrl = process.env.NEXT_PUBLIC_GQL_ENDPOINT || config.baseUrl;

  let context = "## API Reference (if needed)\n\n";
  context += `The MediaJel GraphQL API is available at ${baseUrl}.\n`;
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
      instructions += `This is a company/product question, not an API question.\n`;
      instructions += `- Answer only from the context provided here\n`;
      instructions += `- Say you do not know rather than inventing company details\n`;
      instructions += `- Only include API details if directly relevant\n\n`;
      break;

    case "GENERAL":
      instructions += `## Guidance\n`;
      instructions += `Answer this question using your general knowledge.\n`;
      instructions += `- If unsure about MediaJel-specific information, say so rather than guessing\n`;
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
