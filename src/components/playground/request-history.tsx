"use client";

import { Clock, Trash2, RotateCcw } from "lucide-react";

export interface HistoryEntry {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
  status: number | null;
  timestamp: number;
}

const HISTORY_KEY = "mediajel_http_history";
const MAX_ENTRIES = 50;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // localStorage full or unavailable
  }
}

export function addHistoryEntry(entry: HistoryEntry) {
  const entries = loadHistory();
  entries.unshift(entry);
  saveHistory(entries);
}

function methodColor(method: string) {
  switch (method) {
    case "GET": return "text-blue-600 bg-blue-50";
    case "POST": return "text-green-600 bg-green-50";
    case "PUT": return "text-amber-600 bg-amber-50";
    case "PATCH": return "text-orange-600 bg-orange-50";
    case "DELETE": return "text-red-600 bg-red-50";
    default: return "text-gray-600 bg-gray-50";
  }
}

function statusColor(status: number | null) {
  if (!status) return "text-gray-400";
  if (status < 300) return "text-green-600";
  if (status < 400) return "text-amber-600";
  return "text-red-600";
}

interface RequestHistoryProps {
  entries: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onClear: () => void;
}

export function RequestHistory({ entries, onSelect, onClear }: RequestHistoryProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
        <Clock className="h-5 w-5 mb-2 opacity-50" />
        No request history yet
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground">
          History ({entries.length})
        </span>
        <button
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
        >
          <Trash2 className="h-3 w-3" />
          Clear
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {entries.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSelect(entry)}
            className="w-full text-left px-3 py-2 border-b border-border hover:bg-accent/50 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${methodColor(entry.method)}`}>
                {entry.method}
              </span>
              <span className={`text-xs font-mono ${statusColor(entry.status)}`}>
                {entry.status || "---"}
              </span>
              <RotateCcw className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 ml-auto" />
            </div>
            <div className="text-xs text-muted-foreground truncate mt-1 font-mono">
              {entry.url}
            </div>
            <div className="text-[10px] text-muted-foreground/60 mt-0.5">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
