"use client";

import { useState } from "react";
import { CodeBlock } from "@/components/ui/code-block";
import { generateHttpSnippets } from "@/lib/http-snippets";
import { AlertCircle } from "lucide-react";

interface HttpSnippetsProps {
  query: string;
  variables?: any;
  endpoint: string;
}

const LANGUAGES = [
  { id: "curl", label: "cURL", language: "bash" },
  { id: "javascript", label: "JavaScript (Fetch)", language: "javascript" },
  { id: "javascriptAxios", label: "JavaScript (Axios)", language: "javascript" },
  { id: "python", label: "Python", language: "python" },
  { id: "nodeAxios", label: "Node.js (Axios)", language: "javascript" },
] as const;

type LanguageId = (typeof LANGUAGES)[number]["id"];

export function HttpSnippets({ query, variables, endpoint }: HttpSnippetsProps) {
  const [selectedLang, setSelectedLang] = useState<LanguageId>("curl");
  const snippets = generateHttpSnippets({ query, variables, endpoint });

  const currentLanguage = LANGUAGES.find((l) => l.id === selectedLang);

  return (
    <div className="space-y-4">
      {/* Authentication notice */}
      <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg">
        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <strong>Authentication required:</strong> Replace{" "}
          <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded text-xs font-mono">
            YOUR_ACCESS_TOKEN
          </code>{" "}
          and{" "}
          <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded text-xs font-mono">
            YOUR_ORG_ID
          </code>{" "}
          with your credentials. See the Authentication guide for details.
        </div>
      </div>

      {/* Language selector */}
      <div className="flex flex-wrap gap-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.id}
            onClick={() => setSelectedLang(lang.id)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              selectedLang === lang.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>

      {/* Code block for selected language */}
      <CodeBlock
        code={snippets[selectedLang]}
        language={currentLanguage?.language || "bash"}
        title={`HTTP Request - ${currentLanguage?.label}`}
      />
    </div>
  );
}
