"use client";

import { useState, useRef, useEffect } from "react";
import { Download, FileJson, FileSpreadsheet, ChevronDown, Check } from "lucide-react";
import {
  ExportFormat,
  exportData,
  extractQueryName,
} from "@/lib/export-utils";

interface ExportDropdownProps {
  /** The response data to export (JSON string or parsed object) */
  data: string | unknown;
  /** Optional query string to extract query name from */
  queryString?: string;
  /** Whether the dropdown is disabled */
  disabled?: boolean;
}

interface ExportOption {
  id: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: "json",
    label: "JSON",
    description: "Full response with formatting",
    icon: <FileJson className="h-4 w-4" />,
  },
  {
    id: "csv",
    label: "CSV",
    description: "Flattened data for spreadsheets",
    icon: <FileSpreadsheet className="h-4 w-4" />,
  },
  {
    id: "xlsx",
    label: "Excel",
    description: "Native Excel workbook",
    icon: <FileSpreadsheet className="h-4 w-4" />,
  },
];

export function ExportDropdown({
  data,
  queryString,
  disabled = false,
}: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exportedFormat, setExportedFormat] = useState<ExportFormat | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close dropdown on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const handleExport = async (format: ExportFormat) => {
    try {
      // Parse data if it's a string
      const parsedData = typeof data === "string" ? JSON.parse(data) : data;

      // Extract query name for filename
      const queryName = queryString ? extractQueryName(queryString) : undefined;

      // Perform export
      await exportData(parsedData, format, queryName);

      // Show success feedback
      setExportedFormat(format);
      setTimeout(() => setExportedFormat(null), 2000);

      // Close dropdown
      setIsOpen(false);
    } catch (error) {
      console.error("Export failed:", error);
      // Could add toast notification here
    }
  };

  const hasData = data && (typeof data === "string" ? data.trim() !== "" : true);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || !hasData}
        className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {exportedFormat ? (
          <>
            <Check className="h-3.5 w-3.5 text-green-600" />
            <span className="text-green-600">Exported</span>
          </>
        ) : (
          <>
            <Download className="h-3.5 w-3.5" />
            Export
            <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-white border border-border rounded-md shadow-lg py-1 animate-in fade-in-0 zoom-in-95"
          role="menu"
        >
          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border mb-1">
            Export As
          </div>
          {EXPORT_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => handleExport(option.id)}
              className="flex items-start gap-3 w-full px-3 py-2 text-left hover:bg-accent transition-colors"
              role="menuitem"
            >
              <span className="text-muted-foreground mt-0.5">{option.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground">{option.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
