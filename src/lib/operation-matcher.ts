import { getOperations } from "@/lib/schema";

/**
 * Deterministic stand-in for the LLM operation picker.
 *
 * The picker is a blocking call before anything can stream, and on a slow
 * response it costs more than the answer itself. Most questions name their
 * entity outright, so match those here and keep the model for the rest.
 * Returning null means "not sure" — the caller falls back to the LLM.
 */

interface Family {
  words: string[];
  one?: string;
  many?: string;
  conn?: string;
}

function splitWords(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

/** Group campaign / campaigns / campaignsConnection under one entity. */
function buildFamilies(): Family[] {
  const names = getOperations().map((op) => op.name);
  const set = new Set(names);
  const byBase = new Map<string, Family>();

  for (const name of names) {
    if (name === "authSignIn") continue;
    const conn = name.endsWith("Connection");
    const stem = conn ? name.slice(0, -"Connection".length) : name;
    // campaign -> campaigns, so the plural is the family key when it exists
    const base = set.has(stem + "s") ? stem + "s" : stem;
    const key = base.toLowerCase();

    const family = byBase.get(key) || { words: splitWords(base) };
    if (conn) family.conn = name;
    else if (name === base) family.many = name;
    else family.one = name;
    byBase.set(key, family);
  }
  return Array.from(byBase.values());
}

const FAMILIES = buildFamilies();

const SINGULAR = /\bsingle\b|\bby (its )?id\b|\bone specific\b|\ba specific\b/;
const PAGINATED = /how many|\bcount\b|total number|paginat|cursor|connection/;
const OFF_TOPIC = /authenticat|sign ?in|token|rate limit|error handling|http status/;

// "show me a query" is documentation; "can i see the tasks" wants the records.
const DOC_HINTS =
  /how do i|how would i|show me (a|the) query|what is the query|example query|\bsyntax\b|how does .* work/;

const DATA_HINTS =
  /\bmy\b|\bour\b|\bmine\b|\bi have\b|\bwe have\b|\bdo i have\b|can i see|let me see|can you (show|get|pull|fetch|run|list)|current org|this org|how many|give me (one|a|an) example|\bfor me\b/;

function matchesWord(tokens: Set<string>, word: string): boolean {
  return (
    tokens.has(word) ||
    tokens.has(word + "s") ||
    (word.endsWith("s") && tokens.has(word.slice(0, -1)))
  );
}

export function matchOperation(
  question: string
): { name: string; isDataRequest: boolean } | null {
  const q = question.toLowerCase();
  if (OFF_TOPIC.test(q)) return null;

  const tokens = new Set(q.split(/[^a-z0-9]+/).filter(Boolean));
  const hits = FAMILIES.filter((f) => f.words.every((w) => matchesWord(tokens, w)));

  // Two entities in one question is exactly where a guess goes wrong.
  if (hits.length !== 1) return null;

  const family = hits[0];
  let name: string | undefined;
  if (PAGINATED.test(q)) name = family.conn || family.many;
  else if (SINGULAR.test(q)) name = family.one || family.many;
  else name = family.many || family.conn || family.one;
  if (!name) return null;

  const isDataRequest = !DOC_HINTS.test(q) && DATA_HINTS.test(q);
  return { name, isDataRequest };
}
