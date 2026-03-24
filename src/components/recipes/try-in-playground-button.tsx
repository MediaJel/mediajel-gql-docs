"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { PlaygroundDrawer } from "@/components/playground/playground-drawer";

interface TryInPlaygroundButtonProps {
  query?: string;
  variables?: Record<string, unknown>;
  hasQuery: boolean;
}

export function TryInPlaygroundButton({
  query,
  variables,
  hasQuery,
}: TryInPlaygroundButtonProps) {
  const [playgroundOpen, setPlaygroundOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setPlaygroundOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        <Play className="h-3.5 w-3.5" />
        Open Playground
        {hasQuery && <span className="text-xs opacity-75">(with query)</span>}
      </button>
      <PlaygroundDrawer
        open={playgroundOpen}
        onClose={() => setPlaygroundOpen(false)}
        query={query}
        variables={variables ? JSON.stringify(variables, null, 2) : undefined}
      />
    </>
  );
}
