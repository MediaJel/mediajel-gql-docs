"use client";

import Link from "next/link";
import { BookOpen, Play, MessageSquare } from "lucide-react";

interface HeaderProps {
  onToggleAssistant?: () => void;
}

export function Header({ onToggleAssistant }: HeaderProps) {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-6 justify-between flex-shrink-0">
      <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
        <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground text-sm font-bold">
          M
        </div>
        <span>MediaJel API Docs</span>
      </Link>
      <nav className="flex items-center gap-4">
        <Link
          href="/schema"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <BookOpen className="h-4 w-4" />
          Reference
        </Link>
        <Link
          href="/playground"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Play className="h-4 w-4" />
          Playground
        </Link>
        {onToggleAssistant && (
          <button
            onClick={onToggleAssistant}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Ask AI
          </button>
        )}
      </nav>
    </header>
  );
}
