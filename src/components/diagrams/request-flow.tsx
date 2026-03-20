"use client";

import { cn } from "@/lib/utils";

interface RequestFlowDiagramProps {
  className?: string;
}

export function RequestFlowDiagram({ className }: RequestFlowDiagramProps) {
  return (
    <div
      className={cn(
        "border border-border rounded-lg bg-muted/30 p-6",
        className
      )}
    >
      <div className="space-y-4">
        {/* Request Section */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="bg-primary text-primary-foreground px-4 py-2 text-sm font-medium">
            Request
          </div>
          <div className="p-4 space-y-3">
            {/* Endpoint */}
            <div className="flex items-start gap-3">
              <div className="text-xs font-medium text-muted-foreground w-20 pt-1">
                Endpoint
              </div>
              <div className="flex-1">
                <code className="text-xs font-mono bg-muted px-2 py-1 rounded block">
                  POST https://api.mediajel.com/graphql
                </code>
              </div>
            </div>

            {/* Headers */}
            <div className="flex items-start gap-3">
              <div className="text-xs font-medium text-muted-foreground w-20 pt-1">
                Headers
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex gap-2">
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                    Content-Type
                  </code>
                  <span className="text-xs text-muted-foreground">:</span>
                  <code className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded">
                    application/json
                  </code>
                </div>
                <div className="flex gap-2">
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                    Authorization
                  </code>
                  <span className="text-xs text-muted-foreground">:</span>
                  <code className="text-xs font-mono bg-green-50 text-green-700 px-2 py-1 rounded">
                    Bearer eyJ...
                  </code>
                </div>
                <div className="flex gap-2">
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                    Key
                  </code>
                  <span className="text-xs text-muted-foreground">:</span>
                  <code className="text-xs font-mono bg-purple-50 text-purple-700 px-2 py-1 rounded">
                    your-org-id
                  </code>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex items-start gap-3">
              <div className="text-xs font-medium text-muted-foreground w-20 pt-1">
                Body
              </div>
              <div className="flex-1">
                <div className="font-mono text-xs bg-muted p-3 rounded space-y-1">
                  <div>{"{"}</div>
                  <div className="pl-4">
                    <span className="text-green-600">&quot;query&quot;</span>:{" "}
                    <span className="text-amber-600">&quot;{"{ orgs { id name } }"}&quot;</span>,
                  </div>
                  <div className="pl-4">
                    <span className="text-green-600">&quot;variables&quot;</span>:{" "}
                    <span className="text-muted-foreground">{"{}"}</span>
                  </div>
                  <div>{"}"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <svg
            className="h-8 w-6 text-muted-foreground"
            viewBox="0 0 24 32"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="0" x2="12" y2="24" />
            <polyline points="6,18 12,24 18,18" />
          </svg>
        </div>

        {/* Response Section */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="bg-green-600 text-white px-4 py-2 text-sm font-medium">
            Response
          </div>
          <div className="p-4">
            <div className="font-mono text-xs bg-muted p-3 rounded space-y-1">
              <div>{"{"}</div>
              <div className="pl-4">
                <span className="text-green-600">&quot;data&quot;</span>: {"{"}
              </div>
              <div className="pl-8">
                <span className="text-green-600">&quot;orgs&quot;</span>: [
              </div>
              <div className="pl-12">
                {"{"}{" "}
                <span className="text-green-600">&quot;id&quot;</span>:{" "}
                <span className="text-amber-600">&quot;org-123&quot;</span>,{" "}
                <span className="text-green-600">&quot;name&quot;</span>:{" "}
                <span className="text-amber-600">&quot;My Company&quot;</span>{" "}
                {"}"}
              </div>
              <div className="pl-8">]</div>
              <div className="pl-4">{"}"}</div>
              <div>{"}"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
