import {
  buildSchema,
  GraphQLSchema,
  GraphQLNamedType,
  GraphQLOutputType,
  GraphQLInputType,
  isObjectType,
  isEnumType,
  isInputObjectType,
  isListType,
  isNonNullType,
} from "graphql";
import fs from "fs";
import path from "path";

import apiConfig from "@/content/public-api-config.json";

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
    return "[" + unwrapType(type.ofType) + "]";
  }
  return (type as GraphQLNamedType).name;
}

function getNamedType(
  type: GraphQLOutputType | GraphQLInputType
): GraphQLNamedType {
  if (isNonNullType(type)) return getNamedType(type.ofType);
  if (isListType(type)) return getNamedType(type.ofType);
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

export function getOperations(): OperationInfo[] {
  const schema = getSchema();
  const config = getConfig();
  const operations: OperationInfo[] = [];

  const queryType = schema.getQueryType();
  if (queryType) {
    const fields = queryType.getFields();
    for (const [name, field] of Object.entries(fields)) {
      const opConfig = (config.operations.queries as any)[name];
      if (!opConfig) continue;
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
      const opConfig = (config.operations.mutations as any)[name];
      if (!opConfig) continue;
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

  return operations;
}

export function getCategories() {
  return apiConfig.categories;
}

export function getOperationsByCategory(categoryId: string): OperationInfo[] {
  return getOperations().filter((op) => op.category === categoryId);
}

export function getOperation(name: string): OperationInfo | undefined {
  return getOperations().find((op) => op.name === name);
}

export function getAllTypes(): TypeDetails[] {
  const schema = getSchema();
  const typeMap = schema.getTypeMap();
  const publicTypes: TypeDetails[] = [];

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
