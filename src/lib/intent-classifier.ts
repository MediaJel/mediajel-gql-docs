/**
 * Intent Classifier for Hybrid AI Architecture
 *
 * Classifies user questions to route them to the appropriate context source:
 * - SCHEMA_QUERY: Direct API/GraphQL questions
 * - DOMAIN_KNOWLEDGE: Company/product questions (use RAG)
 * - HYBRID: Business questions that need both glossary and schema context
 * - GENERAL: General questions that don't fit other categories
 */

import {
  DomainGlossary,
  GlossaryMatch,
  searchGlossary,
  loadGlossary,
} from "./domain-glossary";

/**
 * Types of query intents
 */
export type QueryIntent =
  | "SCHEMA_QUERY"
  | "DOMAIN_KNOWLEDGE"
  | "HYBRID"
  | "GENERAL";

/**
 * Result of intent classification
 */
export interface ClassifiedIntent {
  /** The classified intent type */
  intent: QueryIntent;
  /** Confidence score (0-1) */
  confidence: number;
  /** Matched glossary entries if any */
  glossaryMatches: GlossaryMatch[];
  /** Suggested GraphQL operations based on matches */
  suggestedOperations: string[];
  /** Suggested GraphQL types based on matches */
  suggestedTypes: string[];
  /** Keywords that triggered the classification */
  matchedKeywords: string[];
  /** Human-readable explanation of the classification */
  reasoning: string;
}

/**
 * Keywords that indicate direct API/schema questions
 */
const SCHEMA_KEYWORDS = [
  "graphql",
  "query",
  "mutation",
  "subscription",
  "schema",
  "api",
  "endpoint",
  "field",
  "type",
  "input",
  "argument",
  "args",
  "variables",
  "return type",
  "nullable",
  "connection",
  "edge",
  "node",
  "pageinfo",
  "pagination",
  "cursor",
  "introspection",
];

/**
 * Keywords that indicate company/product knowledge questions (RAG)
 */
const DOMAIN_KNOWLEDGE_KEYWORDS = [
  "mediajel",
  "company",
  "team",
  "product",
  "feature",
  "pricing",
  "plan",
  "tier",
  "service",
  "platform",
  "demograph",
  "datajel",
  "buyer",
  "search lights",
  "compliance",
  "cannabis",
  "regulated",
  "about",
  "what is",
  "who is",
  "contact",
  "support",
  "help",
  "how does",
  "why",
  "policy",
  "integration",
  "partner",
  "case study",
  "client",
  "success",
  "attribution",
  "methodology",
];

/**
 * Patterns that suggest technical/API questions
 */
const API_QUESTION_PATTERNS = [
  /how\s+(do\s+i|can\s+i|to)\s+(query|fetch|get|list|create|update|delete|mutate)/i,
  /what\s+(is|are)\s+the\s+(fields?|types?|arguments?|parameters?)/i,
  /show\s+(me\s+)?(the\s+)?(query|mutation|schema|api)/i,
  /example\s+(query|mutation|graphql|api)/i,
  /\b(filter|sort|order\s*by|paginate|pagination)\b/i,
  /\bwhere\s+(clause|input|filter)\b/i,
];

/**
 * Patterns that suggest business/performance questions
 */
const BUSINESS_QUESTION_PATTERNS = [
  /show\s+(me\s+)?(the\s+)?(weekly|monthly|daily|performance|report|data)/i,
  /what('s|s|\s+is)\s+(my|our|the)\s+(roas|roi|spend|revenue|budget)/i,
  /how\s+(is|are|was|were)\s+(my|our|the)\s+(campaign|ad|order)/i,
  /list\s+(all\s+)?(my|our|active|the)\s+(campaigns?|orders?|organizations?)/i,
  /get\s+(me\s+)?(the\s+)?(performance|analytics|metrics|data)/i,
];

/**
 * Normalize text for keyword matching
 */
function normalizeForMatching(text: string): string {
  return text.toLowerCase().trim();
}

/**
 * Check if text contains any of the keywords
 */
function containsKeywords(text: string, keywords: string[]): string[] {
  const normalized = normalizeForMatching(text);
  return keywords.filter((keyword) => normalized.includes(keyword.toLowerCase()));
}

/**
 * Check if text matches any of the patterns
 */
function matchesPatterns(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

/**
 * Classify the intent of a user question
 *
 * @param question - The user's question
 * @param glossary - Optional domain glossary (will load default if not provided)
 * @returns ClassifiedIntent with intent type, confidence, and related information
 */
export function classifyIntent(
  question: string,
  glossary?: DomainGlossary
): ClassifiedIntent {
  const effectiveGlossary = glossary || loadGlossary();
  const normalized = normalizeForMatching(question);

  // Initialize result
  const result: ClassifiedIntent = {
    intent: "GENERAL",
    confidence: 0.5,
    glossaryMatches: [],
    suggestedOperations: [],
    suggestedTypes: [],
    matchedKeywords: [],
    reasoning: "",
  };

  // Check for schema/API keywords
  const schemaKeywordsFound = containsKeywords(question, SCHEMA_KEYWORDS);
  const hasApiPatterns = matchesPatterns(question, API_QUESTION_PATTERNS);

  // Check for domain knowledge keywords
  const domainKeywordsFound = containsKeywords(question, DOMAIN_KNOWLEDGE_KEYWORDS);

  // Check for business question patterns
  const hasBusinessPatterns = matchesPatterns(question, BUSINESS_QUESTION_PATTERNS);

  // Search glossary for matches
  const glossaryMatches = searchGlossary(question, effectiveGlossary, 0.35);

  result.glossaryMatches = glossaryMatches;
  result.matchedKeywords = [...schemaKeywordsFound, ...domainKeywordsFound];

  // Extract operations and types from glossary matches
  if (glossaryMatches.length > 0) {
    const operations = new Set<string>();
    const types = new Set<string>();

    for (const match of glossaryMatches) {
      for (const op of match.entry.relatedOperations) {
        operations.add(op);
      }
      for (const type of match.entry.relatedTypes) {
        types.add(type);
      }
    }

    result.suggestedOperations = Array.from(operations);
    result.suggestedTypes = Array.from(types);
  }

  // Classification logic

  // Strong schema indicators + glossary matches = HYBRID
  if (
    (schemaKeywordsFound.length > 0 || hasApiPatterns) &&
    glossaryMatches.length > 0
  ) {
    result.intent = "HYBRID";
    result.confidence = 0.85;
    result.reasoning =
      "Question contains API/schema keywords and matches business terms in glossary";
    return result;
  }

  // Business patterns + glossary matches = HYBRID
  if (hasBusinessPatterns && glossaryMatches.length > 0) {
    result.intent = "HYBRID";
    result.confidence = 0.9;
    result.reasoning =
      "Question asks about business metrics that map to specific API operations";
    return result;
  }

  // Strong glossary matches without explicit schema keywords = HYBRID
  // (likely a business question that needs technical translation)
  if (
    glossaryMatches.length > 0 &&
    glossaryMatches[0].confidence >= 0.8
  ) {
    result.intent = "HYBRID";
    result.confidence = glossaryMatches[0].confidence;
    result.reasoning = `Strong match on glossary term "${glossaryMatches[0].entry.term}"`;
    return result;
  }

  // Moderate glossary matches = HYBRID with lower confidence
  if (glossaryMatches.length > 0 && glossaryMatches[0].confidence >= 0.5) {
    result.intent = "HYBRID";
    result.confidence = glossaryMatches[0].confidence * 0.9;
    result.reasoning = `Moderate match on glossary term "${glossaryMatches[0].entry.term}"`;
    return result;
  }

  // Pure schema/API question without glossary matches
  if (schemaKeywordsFound.length >= 2 || hasApiPatterns) {
    result.intent = "SCHEMA_QUERY";
    result.confidence = 0.8;
    result.reasoning = "Question is about API/schema structure or syntax";
    return result;
  }

  // Pure domain knowledge question
  if (domainKeywordsFound.length >= 2 || domainKeywordsFound.length > schemaKeywordsFound.length) {
    result.intent = "DOMAIN_KNOWLEDGE";
    result.confidence = 0.75;
    result.reasoning =
      "Question is about company/product information best answered from knowledge base";
    return result;
  }

  // Single schema keyword
  if (schemaKeywordsFound.length === 1) {
    result.intent = "SCHEMA_QUERY";
    result.confidence = 0.6;
    result.reasoning = `Contains schema keyword "${schemaKeywordsFound[0]}"`;
    return result;
  }

  // Single domain keyword
  if (domainKeywordsFound.length === 1) {
    result.intent = "DOMAIN_KNOWLEDGE";
    result.confidence = 0.6;
    result.reasoning = `Contains domain keyword "${domainKeywordsFound[0]}"`;
    return result;
  }

  // Weak glossary match
  if (glossaryMatches.length > 0) {
    result.intent = "HYBRID";
    result.confidence = glossaryMatches[0].confidence * 0.7;
    result.reasoning = `Weak match on glossary term "${glossaryMatches[0].entry.term}"`;
    return result;
  }

  // Default: GENERAL
  result.intent = "GENERAL";
  result.confidence = 0.5;
  result.reasoning = "Question does not match specific patterns";
  return result;
}

/**
 * Quick check if a question is likely API-related
 * Useful for lightweight filtering before full classification
 */
export function isLikelyApiQuestion(question: string): boolean {
  const schemaKeywords = containsKeywords(question, SCHEMA_KEYWORDS);
  const hasApiPatterns = matchesPatterns(question, API_QUESTION_PATTERNS);
  const hasBusinessPatterns = matchesPatterns(question, BUSINESS_QUESTION_PATTERNS);

  return schemaKeywords.length > 0 || hasApiPatterns || hasBusinessPatterns;
}

/**
 * Get a human-readable description of the intent
 */
export function describeIntent(intent: QueryIntent): string {
  switch (intent) {
    case "SCHEMA_QUERY":
      return "Direct API/GraphQL question - will provide schema context";
    case "DOMAIN_KNOWLEDGE":
      return "Company/product question - will search knowledge base";
    case "HYBRID":
      return "Business question - will map to API operations with context";
    case "GENERAL":
      return "General question - will use standard response";
  }
}
