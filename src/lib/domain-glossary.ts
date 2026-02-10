/**
 * Domain Glossary Types and Utilities
 *
 * Maps business terminology to GraphQL operations for the hybrid AI architecture.
 * This enables questions like "Show me weekly performance report" to automatically
 * map to the correct GraphQL query.
 */

import glossaryData from "@/content/domain-glossary.json";

/**
 * Example query showing how a business question maps to a technical GraphQL query
 */
export interface GlossaryExample {
  businessQuestion: string;
  technicalQuery: string;
  variables?: Record<string, unknown>;
}

/**
 * A single glossary entry mapping a business term to GraphQL operations
 */
export interface GlossaryEntry {
  /** Primary business term (e.g., "weekly performance report") */
  term: string;
  /** Alternative names/phrases for this term */
  aliases: string[];
  /** Human-readable description of this term */
  description: string;
  /** GraphQL operations related to this term (e.g., ["pacingDataObjectsConnection"]) */
  relatedOperations: string[];
  /** GraphQL types related to this term (e.g., ["PacingDataObject"]) */
  relatedTypes: string[];
  /** Category for grouping (e.g., "analytics", "campaigns", "organizations") */
  category: string;
  /** Example queries demonstrating business-to-technical translation */
  examples?: GlossaryExample[];
}

/**
 * The complete domain glossary structure
 */
export interface DomainGlossary {
  version: string;
  lastUpdated: string;
  terms: GlossaryEntry[];
}

/**
 * Result of searching the glossary for matching terms
 */
export interface GlossaryMatch {
  entry: GlossaryEntry;
  matchedOn: "term" | "alias";
  matchedText: string;
  confidence: number; // 0-1, where 1 is exact match
}

/**
 * Load the domain glossary from the JSON file
 */
export function loadGlossary(): DomainGlossary {
  return glossaryData as DomainGlossary;
}

/**
 * Normalize text for fuzzy matching
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .replace(/\s+/g, " "); // Normalize whitespace
}

/**
 * Calculate simple similarity score between two strings
 * Uses word overlap approach for fuzzy matching
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = normalizeText(text1).split(" ");
  const words2 = normalizeText(text2).split(" ");
  const set1 = new Set(words1);
  const set2 = new Set(words2);

  if (set1.size === 0 || set2.size === 0) return 0;

  const intersection = words1.filter((w) => set2.has(w));
  const unionArray = Array.from(set1).concat(Array.from(set2).filter((w) => !set1.has(w)));

  return intersection.length / unionArray.length;
}

/**
 * Check if text contains a term (exact or partial)
 */
function containsTerm(text: string, term: string): boolean {
  const normalizedText = normalizeText(text);
  const normalizedTerm = normalizeText(term);
  return normalizedText.includes(normalizedTerm);
}

/**
 * Search the glossary for terms matching the input text
 *
 * @param question - The user's question or search text
 * @param glossary - The domain glossary to search
 * @param threshold - Minimum confidence threshold (0-1, default 0.3)
 * @returns Array of matching glossary entries sorted by confidence
 */
export function searchGlossary(
  question: string,
  glossary: DomainGlossary,
  threshold: number = 0.3
): GlossaryMatch[] {
  const matches: GlossaryMatch[] = [];
  const normalizedQuestion = normalizeText(question);

  for (const entry of glossary.terms) {
    // Check exact term match
    if (containsTerm(question, entry.term)) {
      matches.push({
        entry,
        matchedOn: "term",
        matchedText: entry.term,
        confidence: 1.0,
      });
      continue;
    }

    // Check alias matches
    let aliasMatched = false;
    for (const alias of entry.aliases) {
      if (containsTerm(question, alias)) {
        matches.push({
          entry,
          matchedOn: "alias",
          matchedText: alias,
          confidence: 0.95,
        });
        aliasMatched = true;
        break;
      }
    }
    if (aliasMatched) continue;

    // Check fuzzy match on term
    const termSimilarity = calculateSimilarity(normalizedQuestion, entry.term);
    if (termSimilarity >= threshold) {
      matches.push({
        entry,
        matchedOn: "term",
        matchedText: entry.term,
        confidence: termSimilarity,
      });
      continue;
    }

    // Check fuzzy match on aliases
    for (const alias of entry.aliases) {
      const aliasSimilarity = calculateSimilarity(normalizedQuestion, alias);
      if (aliasSimilarity >= threshold) {
        matches.push({
          entry,
          matchedOn: "alias",
          matchedText: alias,
          confidence: aliasSimilarity * 0.95, // Slightly lower confidence for alias matches
        });
        break;
      }
    }
  }

  // Sort by confidence (highest first) and deduplicate
  const seen = new Set<string>();
  return matches
    .sort((a, b) => b.confidence - a.confidence)
    .filter((match) => {
      if (seen.has(match.entry.term)) return false;
      seen.add(match.entry.term);
      return true;
    });
}

/**
 * Get all operations mentioned in a list of glossary matches
 */
export function getOperationsFromMatches(matches: GlossaryMatch[]): string[] {
  const operations = new Set<string>();
  for (const match of matches) {
    for (const op of match.entry.relatedOperations) {
      operations.add(op);
    }
  }
  return Array.from(operations);
}

/**
 * Get all types mentioned in a list of glossary matches
 */
export function getTypesFromMatches(matches: GlossaryMatch[]): string[] {
  const types = new Set<string>();
  for (const match of matches) {
    for (const type of match.entry.relatedTypes) {
      types.add(type);
    }
  }
  return Array.from(types);
}

/**
 * Get glossary entries by category
 */
export function getEntriesByCategory(
  glossary: DomainGlossary,
  category: string
): GlossaryEntry[] {
  return glossary.terms.filter((entry) => entry.category === category);
}

/**
 * Get all unique categories in the glossary
 */
export function getCategories(glossary: DomainGlossary): string[] {
  const categories = new Set<string>();
  for (const entry of glossary.terms) {
    categories.add(entry.category);
  }
  return Array.from(categories).sort();
}

/**
 * Format glossary entries as markdown for context injection
 */
export function formatGlossaryAsMarkdown(entries: GlossaryEntry[]): string {
  if (entries.length === 0) return "";

  let markdown = "## Relevant Business Terms\n\n";

  for (const entry of entries) {
    markdown += `### ${entry.term}\n`;
    markdown += `${entry.description}\n\n`;
    markdown += `**Related Operations:** ${entry.relatedOperations.join(", ")}\n`;
    markdown += `**Related Types:** ${entry.relatedTypes.join(", ")}\n`;

    if (entry.examples && entry.examples.length > 0) {
      markdown += "\n**Example:**\n";
      const example = entry.examples[0];
      markdown += `- Business Question: "${example.businessQuestion}"\n`;
      markdown += `- Technical Query:\n\`\`\`graphql\n${example.technicalQuery}\n\`\`\`\n`;
      if (example.variables) {
        markdown += `- Variables:\n\`\`\`json\n${JSON.stringify(example.variables, null, 2)}\n\`\`\`\n`;
      }
    }

    markdown += "\n";
  }

  return markdown;
}
