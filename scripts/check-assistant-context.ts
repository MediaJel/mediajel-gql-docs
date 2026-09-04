/**
 * Checks the material the assistant is given, without calling any model.
 *
 * The answer-level suite (test-assistant-answers.js) needs OpenAI credits and
 * is subject to model variance. This checks the layer underneath it: for every
 * published operation, is the context complete, untruncated, and does it hold
 * the specific facts the assistant got wrong before? Those regressions were all
 * missing or malformed context, so they are catchable here — deterministically,
 * for free, and in about a second.
 *
 *   npx tsx scripts/check-assistant-context.ts
 *
 * Exits non-zero on the first broken invariant.
 */

import {
  getOperations,
  describeTypeFields,
  validateQueryDocument,
} from "../src/lib/schema";
import { describeOperationForModel } from "../src/lib/schema-context-builder";
import {
  PUBLIC_QUERY_NAMES,
  PUBLIC_MUTATION_NAMES,
} from "../src/lib/public-operations";

let failures = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    console.log(`  ok    ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

// 1. Every published operation gets usable context.
section("Per-operation context");
const operations = getOperations();
const expected = PUBLIC_QUERY_NAMES.size + PUBLIC_MUTATION_NAMES.size;
check(
  `${operations.length} operations built (allowlist has ${expected})`,
  operations.length === expected,
  `built ${operations.length}`
);

let truncated: string[] = [];
let missingFieldList: string[] = [];
let missingExample: string[] = [];

for (const op of operations) {
  const context = describeOperationForModel(op.name);
  if (!context) {
    missingFieldList.push(`${op.name} (empty context)`);
    continue;
  }
  if (!context.includes("Complete field list")) missingFieldList.push(op.name);
  if (op.exampleQuery && !context.includes(op.exampleQuery.trim().slice(0, 40))) {
    missingExample.push(op.name);
  }
  if (/more nested type\(s\) omitted/.test(context)) truncated.push(op.name);
}

check("every operation has a complete field list", missingFieldList.length === 0, missingFieldList.join(", "));
check("every operation embeds its documented example", missingExample.length === 0, missingExample.join(", "));
check("no operation's nested types are truncated", truncated.length === 0, truncated.join(", "));

// 2. describeType must expose only the published surface.
section("describeType scope");
const queryType = describeTypeFields("Query");
check(
  `Query lists ${PUBLIC_QUERY_NAMES.size} published queries, not all 300`,
  queryType?.fields.length === PUBLIC_QUERY_NAMES.size,
  `got ${queryType?.fields.length}`
);

// 3. The specific facts the assistant previously got wrong. Each of these was a
//    real reported bug; if the context stops carrying them, it regresses.
section("Field facts behind past regressions");

function typeHas(typeName: string, field: string): boolean {
  return (describeTypeFields(typeName)?.fields ?? []).some((f) =>
    f.split(":")[0].trim() === field
  );
}

check("Task.createdBy exists (the original report)", typeHas("Task", "createdBy"));
check("LineItem.createdBy does NOT exist", !typeHas("LineItem", "createdBy"));
check("LineItem has direct clicks/impressions/ctr", ["clicks", "impressions", "ctr"].every((f) => typeHas("LineItem", f)));
check("CampaignOrder.pacingData exists", typeHas("CampaignOrder", "pacingData"));
check("ArticleCategory has title, not name", typeHas("ArticleCategory", "title") && !typeHas("ArticleCategory", "name"));
check("AggregateUnit uses aggImpressions/aggClicks/aggCost", ["aggImpressions", "aggClicks", "aggCost"].every((f) => typeHas("AggregateUnit", f)));

// The performance question that failed for the longest: the context for
// campaignOrdersConnection must reach two levels down to AggregateUnit.
const orderContext = describeOperationForModel("campaignOrdersConnection");
check("campaignOrdersConnection context reaches AggregateUnit", orderContext.includes("aggImpressions"));
check("campaignOrdersConnection context includes PacingDataObject", orderContext.includes("PacingDataObject"));

// tasksConnection is the ONLY published task operation, so its node fields are
// the only route to a Task.
const taskContext = describeOperationForModel("tasksConnection");
check("tasksConnection context exposes Task node fields", taskContext.includes("createdBy"));

// 4. Validation must enforce the allowlist, not merely the schema.
section("Validation enforces the allowlist");
check("unpublished `task` is rejected", validateQueryDocument("query { task(where:{id:\"x\"}){ id } }").length > 0);
check("unpublished `users` is rejected", validateQueryDocument("query { users(first:1){ id } }").length > 0);
check("published `campaigns` is accepted", validateQueryDocument("query { campaigns(first:1){ id } }").length === 0);

// 5. Every documented example must actually run — this is what customers copy.
section("Documented examples validate");
const badExamples = operations
  .filter((op) => op.exampleQuery)
  .map((op) => ({ name: op.name, errors: validateQueryDocument(op.exampleQuery) }))
  .filter((r) => r.errors.length);
check(
  `all ${operations.length} documented examples are valid`,
  badExamples.length === 0,
  badExamples.map((b) => `${b.name}: ${b.errors[0]}`).join("; ")
);

console.log(
  failures === 0
    ? "\nAll context invariants hold."
    : `\n${failures} invariant(s) broken.`
);
process.exit(failures === 0 ? 0 : 1);
