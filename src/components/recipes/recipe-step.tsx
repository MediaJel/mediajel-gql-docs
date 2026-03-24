"use client";

import { useState } from "react";
import { CodeBlock } from "@/components/ui/code-block";
import { Lightbulb, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlaygroundDrawer } from "@/components/playground/playground-drawer";

interface RecipeStepProps {
  stepNumber: number;
  title: string;
  description: string;
  type: "instruction" | "query";
  query?: string;
  variables?: Record<string, unknown>;
  tip?: string;
  className?: string;
}

export function RecipeStep({
  stepNumber,
  title,
  description,
  type,
  query,
  variables,
  tip,
  className,
}: RecipeStepProps) {
  const [playgroundOpen, setPlaygroundOpen] = useState(false);

  return (
    <div className={cn("", className)}>
      <div className="flex items-start gap-4 mb-3">
        <div className="flex-shrink-0 h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
          {stepNumber}
        </div>
        <div>
          <h3 className="font-semibold text-base">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </div>

      {type === "query" && query && (
        <div className="ml-12 space-y-3">
          <CodeBlock language="graphql" title="Query" code={query} />
          {variables && Object.keys(variables).length > 0 && (
            <CodeBlock
              language="json"
              title="Variables"
              code={JSON.stringify(variables, null, 2)}
            />
          )}
          <button
            onClick={() => setPlaygroundOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
          >
            <Play className="h-3 w-3" />
            Try in Playground
          </button>
          <PlaygroundDrawer
            open={playgroundOpen}
            onClose={() => setPlaygroundOpen(false)}
            query={query}
            variables={variables ? JSON.stringify(variables, null, 2) : undefined}
          />
        </div>
      )}

      {tip && (
        <div className="ml-12 mt-3 flex items-start gap-2 text-xs bg-amber-50 border border-amber-100 rounded-lg p-3">
          <Lightbulb className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <span className="text-amber-800">{tip}</span>
        </div>
      )}
    </div>
  );
}
