"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import glossary from "@/content/ui-glossary.json";
import { cn } from "@/lib/utils";

type GlossaryKey = keyof typeof glossary;

interface TermProps {
  id: GlossaryKey;
  children: React.ReactNode;
  className?: string;
}

export function Term({ id, children, className }: TermProps) {
  const definition = glossary[id];

  if (!definition) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span
            className={cn(
              "border-b border-dashed border-muted-foreground/50 cursor-help",
              className
            )}
          >
            {children}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-50 max-w-xs rounded-md bg-foreground px-3 py-2 text-sm text-background shadow-md animate-in fade-in-0 zoom-in-95"
            sideOffset={5}
          >
            <p className="font-medium mb-1">{definition.simple}</p>
            <p className="text-xs opacity-80">{definition.detail}</p>
            <Tooltip.Arrow className="fill-foreground" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

export function TermInline({ id, children, className }: TermProps) {
  const definition = glossary[id];

  if (!definition) {
    return (
      <code className={cn("bg-muted px-1 rounded", className)}>{children}</code>
    );
  }

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <code
            className={cn(
              "bg-muted px-1 rounded border-b border-dashed border-muted-foreground/50 cursor-help",
              className
            )}
          >
            {children}
          </code>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-50 max-w-xs rounded-md bg-foreground px-3 py-2 text-sm text-background shadow-md animate-in fade-in-0 zoom-in-95"
            sideOffset={5}
          >
            <p className="font-medium mb-1">{definition.simple}</p>
            <p className="text-xs opacity-80">{definition.detail}</p>
            <Tooltip.Arrow className="fill-foreground" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
