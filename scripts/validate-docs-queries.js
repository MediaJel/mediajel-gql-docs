/**
 * Validates every GraphQL query embedded in the docs against the local schema.
 *
 * This is a purely static check — it needs no access token, no org ID, and never
 * touches the network. It answers "is this query well-formed and schema-correct?",
 * which is a separate question from "does my token have permission to run it?".
 *
 * Sources checked:
 *   - src/content/recipes/*.json        → steps[].query      (+ steps[].variables)
 *   - src/content/public-api-config.json → operations.{queries,mutations}[].exampleQuery
 *                                          (+ .exampleVariables)
 *
 * Usage:
 *   node scripts/validate-docs-queries.js           # summary + failures
 *   node scripts/validate-docs-queries.js --verbose # also list passing operations
 *   node scripts/validate-docs-queries.js --json    # machine-readable report
 *
 * Exit code is 1 if any query fails, so this can gate CI.
 */

const fs = require("fs");
const path = require("path");
const {
  buildSchema,
  parse,
  validate,
  specifiedRules,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  isNonNullType,
  typeFromAST,
} = require("graphql");

const ROOT = path.resolve(__dirname, "..");
const SCHEMA_PATH = path.join(ROOT, "src/content/public-schema.graphql");
const RECIPES_DIR = path.join(ROOT, "src/content/recipes");
const CONFIG_PATH = path.join(ROOT, "src/content/public-api-config.json");

const argv = process.argv.slice(2);
const VERBOSE = argv.includes("--verbose");
const AS_JSON = argv.includes("--json");

function loadSchema() {
  const sdl = fs.readFileSync(SCHEMA_PATH, "utf8");
  // assumeValidSDL keeps startup fast; the schema is generated upstream and is
  // assumed internally consistent. Query validation below is still full-strength.
  return buildSchema(sdl, { assumeValidSDL: true });
}

/** Collect every query the docs publish, tagged with where it came from. */
function collectQueries() {
  const out = [];

  for (const file of fs.readdirSync(RECIPES_DIR).filter((f) => f.endsWith(".json"))) {
    const recipe = JSON.parse(fs.readFileSync(path.join(RECIPES_DIR, file), "utf8"));
    (recipe.steps || []).forEach((step, i) => {
      if (!step.query) return;
      out.push({
        source: `recipes/${file}`,
        id: `${recipe.slug || file}: step ${i + 1} "${step.title || "untitled"}"`,
        query: step.query,
        variables: step.variables || null,
        expectedRootField: null,
      });
    });
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  for (const kind of ["queries", "mutations"]) {
    const group = (config.operations || {})[kind] || {};
    for (const [name, op] of Object.entries(group)) {
      if (!op.exampleQuery) continue;
      out.push({
        source: `public-api-config.json/${kind}`,
        id: name,
        query: op.exampleQuery,
        variables: op.exampleVariables || null,
        // The config keys operations by root field name, so drift between the key
        // and the query body is itself a docs bug worth catching.
        expectedRootField: name,
      });
    }
  }

  return out;
}

/**
 * Required variables ($x: T!) with no default must be present in the documented
 * example variables, otherwise the snippet cannot be run as published.
 */
function checkVariableCoverage(doc, variables) {
  const problems = [];
  const provided = variables || {};
  for (const def of doc.definitions) {
    if (def.kind !== "OperationDefinition") continue;
    for (const varDef of def.variableDefinitions || []) {
      const varName = varDef.variable.name.value;
      const required =
        varDef.type.kind === "NonNullType" && varDef.defaultValue == null;
      if (required && !(varName in provided)) {
        problems.push(`missing required example variable $${varName}`);
      }
    }
  }
  return problems;
}

/** Confirm the query's root selection matches the name the docs file it under. */
function checkRootField(doc, expected) {
  if (!expected) return [];
  for (const def of doc.definitions) {
    if (def.kind !== "OperationDefinition") continue;
    const roots = def.selectionSet.selections
      .filter((s) => s.kind === "Field")
      .map((s) => s.name.value);
    if (roots.length && !roots.includes(expected)) {
      return [
        `documented as "${expected}" but the query selects ${roots
          .map((r) => `"${r}"`)
          .join(", ")}`,
      ];
    }
  }
  return [];
}

function main() {
  const schema = loadSchema();
  const entries = collectQueries();
  const results = [];

  for (const entry of entries) {
    const result = { ...entry, status: "pass", errors: [] };
    delete result.query;

    let doc;
    try {
      doc = parse(entry.query);
    } catch (err) {
      result.status = "syntax-error";
      result.errors.push(err.message);
      results.push(result);
      continue;
    }

    const validationErrors = validate(schema, doc, specifiedRules);
    if (validationErrors.length) {
      result.status = "schema-error";
      result.errors.push(...validationErrors.map((e) => e.message));
    }

    const varProblems = checkVariableCoverage(doc, entry.variables);
    if (varProblems.length) {
      if (result.status === "pass") result.status = "variable-error";
      result.errors.push(...varProblems);
    }

    const rootProblems = checkRootField(doc, entry.expectedRootField);
    if (rootProblems.length) {
      if (result.status === "pass") result.status = "naming-error";
      result.errors.push(...rootProblems);
    }

    results.push(result);
  }

  if (AS_JSON) {
    console.log(JSON.stringify(results, null, 2));
    process.exit(results.some((r) => r.status !== "pass") ? 1 : 0);
  }

  const failures = results.filter((r) => r.status !== "pass");
  const byStatus = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  console.log(`\nValidated ${results.length} documented operations against`);
  console.log(`${path.relative(ROOT, SCHEMA_PATH)}\n`);

  for (const [status, count] of Object.entries(byStatus).sort()) {
    console.log(`  ${status.padEnd(16)} ${count}`);
  }

  if (VERBOSE) {
    console.log("\n--- PASSING ---");
    for (const r of results.filter((x) => x.status === "pass")) {
      console.log(`  ok  ${r.source}  ${r.id}`);
    }
  }

  if (failures.length) {
    console.log(`\n--- FAILURES (${failures.length}) ---\n`);
    for (const f of failures) {
      console.log(`[${f.status}] ${f.source}`);
      console.log(`  ${f.id}`);
      for (const e of f.errors) console.log(`    - ${e}`);
      console.log("");
    }
  } else {
    console.log("\nAll documented queries are schema-valid.\n");
  }

  process.exit(failures.length ? 1 : 0);
}

main();
