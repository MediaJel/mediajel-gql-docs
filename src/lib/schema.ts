import {
  buildSchema,
  parse,
  print,
  validate,
  specifiedRules,
  GraphQLSchema,
  GraphQLNamedType,
  GraphQLOutputType,
  GraphQLInputType,
  isObjectType,
  isEnumType,
  isInputObjectType,
  isListType,
  isNonNullType,
  isInputType,
  typeFromAST,
  coerceInputValue,
} from "graphql";
import fs from "fs";
import path from "path";

import apiConfig from "@/content/public-api-config.json";
import exampleOverrides from "@/lib/example-overrides.json";
import {
  getPublicCategoryIds,
  isPublicOperation,
  PUBLIC_MUTATION_NAMES,
  PUBLIC_QUERY_NAMES,
} from "@/lib/public-operations";

let _schema: GraphQLSchema | null = null;

function readSchemaSDL(): string {
  const filePath = path.join(
    process.cwd(),
    "src/content/public-schema.graphql"
  );
  return fs.readFileSync(filePath, "utf-8");
}

export function getSchemaSDL(): string {
  return readSchemaSDL();
}

let _publicSDL: string | null = null;

/**
 * The SDL with `type Query` and `type Mutation` narrowed to the published
 * operations. Every other type definition is left intact, since the published
 * operations still return and accept them.
 *
 * The raw SDL lists all 300 generated fields. Handing that to the AI assistant
 * would have it compose queries for operations the docs no longer document and
 * a customer key cannot call.
 */
export function getPublicSchemaSDL(): string {
  if (_publicSDL) return _publicSDL;

  const doc = parse(readSchemaSDL());
  const filtered = {
    ...doc,
    definitions: doc.definitions.map((def) => {
      if (
        def.kind !== "ObjectTypeDefinition" ||
        (def.name.value !== "Query" && def.name.value !== "Mutation")
      ) {
        return def;
      }
      const type = def.name.value === "Query" ? "query" : "mutation";
      return {
        ...def,
        fields: (def.fields ?? []).filter((f) =>
          isPublicOperation(f.name.value, type)
        ),
      };
    }),
  };

  _publicSDL = print(filtered as typeof doc);
  return _publicSDL;
}

export function getSchema(): GraphQLSchema {
  if (!_schema) {
    _schema = buildSchema(readSchemaSDL());
  }
  return _schema;
}

export function getConfig() {
  return apiConfig;
}

export interface OperationInfo {
  name: string;
  type: "query" | "mutation";
  category: string;
  description: string;
  args: ArgInfo[];
  returnType: string;
  returnTypeDetails: TypeDetails;
  exampleQuery: string;
  exampleVariables: any;
  exampleResponse: any;
}

export interface ArgInfo {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface TypeDetails {
  name: string;
  kind: "OBJECT" | "ENUM" | "SCALAR" | "INPUT_OBJECT" | "LIST";
  fields?: FieldInfo[];
  enumValues?: string[];
}

export interface FieldInfo {
  name: string;
  type: string;
  description?: string;
}

function unwrapType(type: GraphQLOutputType | GraphQLInputType): string {
  if (isNonNullType(type)) {
    return unwrapType(type.ofType) + "!";
  }
  if (isListType(type)) {
    return "[" + unwrapType(type.ofType as GraphQLOutputType | GraphQLInputType) + "]";
  }
  return (type as GraphQLNamedType).name;
}

function getNamedType(
  type: GraphQLOutputType | GraphQLInputType
): GraphQLNamedType {
  if (isNonNullType(type)) return getNamedType(type.ofType);
  if (isListType(type)) return getNamedType(type.ofType as GraphQLOutputType | GraphQLInputType);
  return type as GraphQLNamedType;
}

function getTypeDetails(
  schema: GraphQLSchema,
  type: GraphQLOutputType
): TypeDetails {
  const namedType = getNamedType(type);

  if (isObjectType(namedType)) {
    const fields = namedType.getFields();
    return {
      name: namedType.name,
      kind: "OBJECT",
      fields: Object.values(fields).map((f) => ({
        name: f.name,
        type: unwrapType(f.type),
        description: f.description || undefined,
      })),
    };
  }

  if (isEnumType(namedType)) {
    return {
      name: namedType.name,
      kind: "ENUM",
      enumValues: namedType.getValues().map((v) => v.name),
    };
  }

  if (isInputObjectType(namedType)) {
    const fields = namedType.getFields();
    return {
      name: namedType.name,
      kind: "INPUT_OBJECT",
      fields: Object.values(fields).map((f) => ({
        name: f.name,
        type: unwrapType(f.type),
        description: f.description || undefined,
      })),
    };
  }

  return { name: namedType.name, kind: "SCALAR" };
}

export interface ExcludedOperation {
  name: string;
  type: "query" | "mutation";
  category: string;
  errors: string[];
}

let _operations: OperationInfo[] | null = null;
let _excluded: ExcludedOperation[] | null = null;

/**
 * Checks whether a documented example query is actually runnable against the
 * schema. The upstream generator that produces `public-api-config.json` appends
 * a `{ id }` selection to every operation regardless of return type, which emits
 * examples that can never execute — e.g. a selection set on a `JSON` scalar, or
 * `id` on a type that has no such field. Those operations are hidden from the
 * docs rather than shipped as copy-paste traps.
 *
 * This is deliberately a code-level filter rather than an edit to the config.
 * `src/content` is rebuilt from S3 by `scripts/sync-schema.js` — at image build
 * time and again at container start — so a data-level fix would depend on the
 * Dockerfile's `COPY . .` happening to restore the committed copy afterwards.
 * Filtering in code holds regardless of that ordering, and it covers the chat
 * route, which re-reads the file from disk at runtime. When the upstream
 * generator is corrected, these operations reappear with no list to maintain.
 *
 * Note this validates form, not permissions — permissions are handled by the
 * allowlist in `public-operations.ts`, which runs first.
 */
/**
 * Corrected examples for published operations whose generated example is wrong.
 * Each entry says why in its `note`. Without these an operation either drops out
 * of the docs (invalid query) or ships an example that errors when a customer
 * runs it — both wrong for operations customers are meant to call.
 *
 * `scripts/verify-published-operations.js` reads the same file, so what the docs
 * show is what gets tested.
 */
const EXAMPLE_OVERRIDES = exampleOverrides as Record<
  string,
  { note?: string; exampleQuery?: string; exampleVariables?: unknown }
>;

/**
 * Drops placeholder filter values from a list operation's example variables.
 *
 * The generator fills every `where` with `{ id: "example-id" }`. On a filter
 * argument that matches no record, so every list example returns an empty array
 * — a customer copying it concludes the API has no data. Removing the filter
 * makes the example return the first page, which is what a list example is for.
 *
 * Single-record lookups keep their placeholder: `where` is required there, and
 * `"example-id"` correctly signals "substitute your own id".
 */
function stripPlaceholderFilter(field: any, opConfig: any): any {
  const whereArg = field?.args?.find((a: any) => a.name === "where");
  if (!whereArg) return opConfig;
  // WhereUniqueInput identifies one record; WhereInput filters a list.
  if (unwrapType(whereArg.type).includes("WhereUniqueInput")) return opConfig;

  const vars = opConfig.exampleVariables;
  if (!vars || typeof vars !== "object" || !vars.where) return opConfig;

  const kept = Object.entries(vars.where).filter(
    ([, value]) => !(typeof value === "string" && value.startsWith("example-"))
  );
  if (kept.length === Object.keys(vars.where).length) return opConfig;

  const next = { ...vars };
  if (kept.length) next.where = Object.fromEntries(kept);
  else delete next.where;
  return { ...opConfig, exampleVariables: next };
}

function withOverrides(name: string, raw: any): any {
  const override = EXAMPLE_OVERRIDES[name];
  if (!override) return raw;
  return {
    ...raw,
    ...(override.exampleQuery ? { exampleQuery: override.exampleQuery } : {}),
    ...(override.exampleVariables
      ? { exampleVariables: override.exampleVariables }
      : {}),
  };
}

function validateExample(
  schema: GraphQLSchema,
  exampleQuery: string | undefined
): string[] {
  // No example to check means nothing to disprove; keep the operation.
  if (!exampleQuery) return [];
  try {
    return validate(schema, parse(exampleQuery), specifiedRules).map(
      (e) => e.message
    );
  } catch (err) {
    return [err instanceof Error ? err.message : String(err)];
  }
}

/**
 * Validates a query against the real schema, returning validator messages.
 *
 * The same check that hides operations with broken examples at build time,
 * exposed so the assistant can be held to it too: a query the docs would
 * refuse to publish should never reach a user from the chat either.
 */
export function validateQueryDocument(query: string): string[] {
  return validateExample(getPublicSchema(), query);
}

let _publicSchemaObject: GraphQLSchema | null = null;

/**
 * The schema narrowed to the published operations.
 *
 * Validating against the full schema accepts operations the docs deliberately
 * do not publish — `task` and `users` both came back valid — which let the
 * assistant present an unpublished operation as usable. Validation has to use
 * the same allowlist the docs do.
 */
function getPublicSchema(): GraphQLSchema {
  if (!_publicSchemaObject) {
    _publicSchemaObject = buildSchema(getPublicSchemaSDL());
  }
  return _publicSchemaObject;
}

/**
 * Checks example variables against the query's own variable definitions.
 *
 * Document validation alone misses the most common mistake here: the document
 * is fine and the *values* are wrong. `{ orgs: { some: … } }` is Prisma 2
 * syntax that this Prisma 1 API rejects, and nothing in the query text says so.
 */
export function validateQueryVariables(
  query: string,
  variables: Record<string, unknown> | undefined
): string[] {
  if (!variables) return [];
  const schema = getPublicSchema();
  const errors: string[] = [];

  let doc;
  try {
    doc = parse(query);
  } catch {
    return []; // Document errors are already reported by validateQueryDocument.
  }

  for (const def of doc.definitions) {
    if (def.kind !== "OperationDefinition" || !def.variableDefinitions) continue;
    for (const varDef of def.variableDefinitions) {
      const name = varDef.variable.name.value;
      if (!(name in variables)) continue;
      const type = typeFromAST(schema, varDef.type);
      if (!type || !isInputType(type)) continue;
      coerceInputValue(variables[name], type, (path, _value, error) => {
        const where = path.length ? ` at \`${name}.${path.join(".")}\`` : ` for \`$${name}\``;
        errors.push(`${error.message}${where}`);
      });
    }
  }

  return errors;
}

/**
 * Field names on any type in the schema, or null if there is no such type.
 *
 * The per-operation context can only ever show the return type's own fields.
 * That leaves every relation opaque — `Task.createdBy` is a `User`, and nothing
 * in the context says what a `User` has — and it leaves Connection types
 * showing only `pageInfo/edges/aggregate`. Rather than inline the whole type
 * graph, let the assistant look a type up when it needs one.
 */
export function describeTypeFields(
  typeName: string
): { name: string; kind: string; fields: string[] } | null {
  const bare = typeName.replace(/[![\]]/g, "");
  // The published schema, so a lookup of Query or Mutation lists only the
  // operations the docs publish rather than all 300.
  const type = getPublicSchema().getType(bare);
  if (!type) return null;

  if (isEnumType(type)) {
    return {
      name: bare,
      kind: "ENUM",
      fields: type.getValues().map((v) => v.name),
    };
  }
  if (isObjectType(type) || isInputObjectType(type)) {
    return {
      name: bare,
      kind: isObjectType(type) ? "OBJECT" : "INPUT_OBJECT",
      fields: Object.entries(type.getFields()).map(
        ([name, field]) => `${name}: ${unwrapType(field.type)}`
      ),
    };
  }
  return { name: bare, kind: "SCALAR", fields: [] };
}

/** Operations hidden from the docs because their example cannot execute. */
export function getExcludedOperations(): ExcludedOperation[] {
  if (!_excluded) buildOperations();
  return _excluded!;
}

function buildOperations(): void {
  const schema = getSchema();
  const config = getConfig();
  const operations: OperationInfo[] = [];
  const excluded: ExcludedOperation[] = [];

  const queryType = schema.getQueryType();
  if (queryType) {
    const fields = queryType.getFields();
    for (const [name, field] of Object.entries(fields)) {
      if (!isPublicOperation(name, "query")) continue;
      const raw = (config.operations.queries as any)[name];
      if (!raw) continue;
      const opConfig = stripPlaceholderFilter(field, withOverrides(name, raw));
      const errors = validateExample(schema, opConfig.exampleQuery);
      if (errors.length) {
        excluded.push({
          name,
          type: "query",
          category: opConfig.category,
          errors,
        });
        continue;
      }
      operations.push({
        name,
        type: "query",
        category: opConfig.category,
        description: opConfig.description,
        args: field.args.map((a) => ({
          name: a.name,
          type: unwrapType(a.type),
          required: isNonNullType(a.type),
          description: a.description || undefined,
        })),
        returnType: unwrapType(field.type),
        returnTypeDetails: getTypeDetails(schema, field.type),
        exampleQuery: opConfig.exampleQuery,
        exampleVariables: opConfig.exampleVariables,
        exampleResponse: opConfig.exampleResponse,
      });
    }
  }

  const mutationType = schema.getMutationType();
  if (mutationType) {
    const fields = mutationType.getFields();
    for (const [name, field] of Object.entries(fields)) {
      if (!isPublicOperation(name, "mutation")) continue;
      const rawMutation = (config.operations.mutations as any)[name];
      if (!rawMutation) continue;
      const opConfig = withOverrides(name, rawMutation);
      const errors = validateExample(schema, opConfig.exampleQuery);
      if (errors.length) {
        excluded.push({
          name,
          type: "mutation",
          category: opConfig.category,
          errors,
        });
        continue;
      }
      operations.push({
        name,
        type: "mutation",
        category: opConfig.category,
        description: opConfig.description,
        args: field.args.map((a) => ({
          name: a.name,
          type: unwrapType(a.type),
          required: isNonNullType(a.type),
          description: a.description || undefined,
        })),
        returnType: unwrapType(field.type),
        returnTypeDetails: getTypeDetails(schema, field.type),
        exampleQuery: opConfig.exampleQuery,
        exampleVariables: opConfig.exampleVariables,
        exampleResponse: opConfig.exampleResponse,
      });
    }
  }

  if (excluded.length) {
    // Surfaced at build time so a growing exclusion list is visible rather than
    // silently shrinking the docs.
    console.warn(
      `[schema] Hiding ${excluded.length} operation(s) with unrunnable examples. ` +
        `Run \`node scripts/validate-docs-queries.js\` for details.`
    );
  }

  // An allowlisted operation that no longer exists upstream would otherwise just
  // stop appearing, with the docs looking intentional. Name it instead.
  const published = new Set(operations.map((o) => o.name));
  const missing = [
    ...Array.from(PUBLIC_QUERY_NAMES),
    ...Array.from(PUBLIC_MUTATION_NAMES),
  ].filter(
    (n) => !published.has(n) && !excluded.some((e) => e.name === n)
  );

  if (missing.length) {
    console.warn(
      `[schema] ${missing.length} allowlisted operation(s) are not in the ` +
        `generated schema and will not be documented: ${missing.join(", ")}. ` +
        `Either the backend removed them or public-operations.ts is stale.`
    );
  }

  _operations = operations;
  _excluded = excluded;
}

export function getOperations(): OperationInfo[] {
  if (!_operations) buildOperations();
  return _operations!;
}

/** Only categories that still publish at least one operation. */
export function getCategories() {
  const published = getPublicCategoryIds();
  return apiConfig.categories.filter((c) => published.has(c.id));
}

export function getOperationsByCategory(categoryId: string): OperationInfo[] {
  return getOperations().filter((op) => op.category === categoryId);
}

export function getOperation(name: string): OperationInfo | undefined {
  return getOperations().find((op) => op.name === name);
}

/**
 * Names of every type reachable from a published operation, following return
 * types and arguments transitively.
 *
 * The schema defines ~895 types, most of them only reachable from operations the
 * docs no longer publish. Listing all of them would advertise a surface far
 * larger than the 32 operations can actually return.
 */
function getReachableTypeNames(schema: GraphQLSchema): Set<string> {
  const seen = new Set<string>();

  const visit = (type: GraphQLOutputType | GraphQLInputType): void => {
    const named = getNamedType(type);
    if (seen.has(named.name)) return;
    seen.add(named.name);

    if (isObjectType(named) || isInputObjectType(named)) {
      for (const field of Object.values(named.getFields())) {
        visit(field.type);
        if ("args" in field) {
          for (const arg of field.args) visit(arg.type);
        }
      }
    }
  };

  for (const [root, kind] of [
    [schema.getQueryType(), "query"],
    [schema.getMutationType(), "mutation"],
  ] as const) {
    if (!root) continue;
    for (const [name, field] of Object.entries(root.getFields())) {
      if (!isPublicOperation(name, kind)) continue;
      visit(field.type);
      for (const arg of field.args) visit(arg.type);
    }
  }

  return seen;
}

export function getAllTypes(): TypeDetails[] {
  const schema = getSchema();
  const typeMap = schema.getTypeMap();
  const publicTypes: TypeDetails[] = [];
  const reachable = getReachableTypeNames(schema);

  const skipTypes = new Set([
    "Query",
    "Mutation",
    "Subscription",
    "String",
    "Boolean",
    "Int",
    "Float",
    "ID",
  ]);

  for (const [name, type] of Object.entries(typeMap)) {
    if (name.startsWith("__")) continue;
    if (skipTypes.has(name)) continue;
    if (!reachable.has(name)) continue;

    if (isObjectType(type)) {
      const fields = type.getFields();
      publicTypes.push({
        name,
        kind: "OBJECT",
        fields: Object.values(fields).map((f) => ({
          name: f.name,
          type: unwrapType(f.type),
          description: f.description || undefined,
        })),
      });
    } else if (isEnumType(type)) {
      publicTypes.push({
        name,
        kind: "ENUM",
        enumValues: type.getValues().map((v) => v.name),
      });
    } else if (isInputObjectType(type)) {
      const fields = type.getFields();
      publicTypes.push({
        name,
        kind: "INPUT_OBJECT",
        fields: Object.values(fields).map((f) => ({
          name: f.name,
          type: unwrapType(f.type),
          description: f.description || undefined,
        })),
      });
    }
  }

  return publicTypes;
}
