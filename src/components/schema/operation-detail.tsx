"use client";

import { useState } from "react";
import { CodeBlock } from "@/components/ui/code-block";
import { Badge } from "@/components/ui/badge";
import type { OperationInfo } from "@/lib/schema";
import { Play, Globe } from "lucide-react";
import { HttpSnippets } from "./http-snippets";
import { PlaygroundDrawer } from "@/components/playground/playground-drawer";

interface OperationDetailProps {
  operation: OperationInfo;
}

export function OperationDetail({ operation }: OperationDetailProps) {
  const [viewMode, setViewMode] = useState<"graphql" | "http">("graphql");
  const [playgroundOpen, setPlaygroundOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"graphql" | "http">("graphql");
  const gqlEndpoint =
    process.env.NEXT_PUBLIC_GQL_ENDPOINT || "https://api.mediajel.com";

  return (
    <div className="space-y-8">
      {/* Arguments table */}
      {operation.args.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Arguments</h2>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-2 font-medium">Name</th>
                  <th className="text-left px-4 py-2 font-medium">Type</th>
                  <th className="text-left px-4 py-2 font-medium">Required</th>
                  <th className="text-left px-4 py-2 font-medium">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {operation.args.map((arg) => (
                  <tr
                    key={arg.name}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-2 font-mono text-sm">{arg.name}</td>
                    <td className="px-4 py-2 font-mono text-sm text-primary">
                      {arg.type}
                    </td>
                    <td className="px-4 py-2">
                      {arg.required ? (
                        <Badge variant="required">Required</Badge>
                      ) : (
                        <Badge variant="optional">Optional</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {arg.description || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Return type */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Return Type</h2>
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <code className="font-mono text-sm font-medium text-primary">
              {operation.returnType}
            </code>
            <Badge>
              {operation.returnTypeDetails.kind === "OBJECT"
                ? "type"
                : operation.returnTypeDetails.kind === "INPUT_OBJECT"
                ? "input"
                : operation.returnTypeDetails.kind.toLowerCase()}
            </Badge>
          </div>
          {operation.returnTypeDetails.fields && (
            <div className="space-y-1">
              {operation.returnTypeDetails.fields.map((field) => (
                <div
                  key={field.name}
                  className="flex items-center gap-3 text-sm py-1 px-2 rounded hover:bg-muted/50"
                >
                  <span className="font-mono">{field.name}</span>
                  <span className="font-mono text-primary text-xs">
                    {field.type}
                  </span>
                  {field.description && (
                    <span className="text-muted-foreground text-xs">
                      {field.description}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {operation.returnTypeDetails.enumValues && (
            <div className="flex flex-wrap gap-2">
              {operation.returnTypeDetails.enumValues.map((v) => (
                <code
                  key={v}
                  className="text-xs bg-muted px-2 py-1 rounded font-mono"
                >
                  {v}
                </code>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Example query */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Example</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setDrawerMode("graphql"); setPlaygroundOpen(true); }}
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Play className="h-3.5 w-3.5" />
              Try in Playground
            </button>
            <button
              onClick={() => { setDrawerMode("http"); setPlaygroundOpen(true); }}
              className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 hover:underline"
            >
              <Globe className="h-3.5 w-3.5" />
              Try via HTTP
            </button>
          </div>
        </div>

        {/* Tab selector */}
        <div className="flex gap-2 mb-4 border-b border-border">
          <button
            onClick={() => setViewMode("graphql")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              viewMode === "graphql"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            GraphQL
          </button>
          <button
            onClick={() => setViewMode("http")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              viewMode === "http"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            HTTP Request
          </button>
        </div>

        {/* Content based on selected tab */}
        {viewMode === "graphql" ? (
          <div className="space-y-4">
            <CodeBlock
              code={operation.exampleQuery}
              language="graphql"
              title="Query"
            />
            {operation.exampleVariables && (
              <CodeBlock
                code={JSON.stringify(operation.exampleVariables, null, 2)}
                language="json"
                title="Variables"
              />
            )}
          </div>
        ) : (
          <HttpSnippets
            query={operation.exampleQuery}
            variables={operation.exampleVariables}
            endpoint={gqlEndpoint}
          />
        )}
      </section>

      {/* Example response */}
      {operation.exampleResponse && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Example Response</h2>
          <CodeBlock
            code={JSON.stringify(operation.exampleResponse, null, 2)}
            language="json"
            title="Response"
          />
        </section>
      )}

      <PlaygroundDrawer
        open={playgroundOpen}
        onClose={() => setPlaygroundOpen(false)}
        mode={drawerMode}
        query={operation.exampleQuery}
        variables={
          operation.exampleVariables
            ? JSON.stringify(operation.exampleVariables, null, 2)
            : undefined
        }
      />
    </div>
  );
}
