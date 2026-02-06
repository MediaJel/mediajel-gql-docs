"use client";

import { useChat } from "ai/react";
import { useEffect, useRef } from "react";
import {
  Send,
  MessageSquare,
  Loader2,
  Play,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { CodeBlock } from "@/components/ui/code-block";
import Link from "next/link";

/**
 * Given a message's raw markdown and a graphql code snippet,
 * find the JSON variables block that immediately follows it.
 */
function findVariablesForQuery(markdown: string, queryCode: string): string | undefined {
  const codeBlockRe = /```(\w+)\n([\s\S]*?)```/g;
  const blocks: { language: string; code: string; index: number }[] = [];
  let m;
  while ((m = codeBlockRe.exec(markdown)) !== null) {
    blocks.push({ language: m[1], code: m[2].trim(), index: m.index });
  }

  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].language === "graphql" && blocks[i].code === queryCode.trim()) {
      if (i + 1 < blocks.length && blocks[i + 1].language === "json") {
        return blocks[i + 1].code;
      }
      break;
    }
  }
  return undefined;
}

const STARTER_PROMPTS = [
  "How do I authenticate with the API?",
  "Show me how to list campaigns",
  "How do I paginate results?",
  "What fields are on the Org type?",
];

interface ChatDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function ChatDrawer({ open, onClose }: ChatDrawerProps) {
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[420px] bg-background border-l border-border z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">AI Query Assistant</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Ask me anything about the MediaJel API. I can help you build
                queries and understand types.
              </p>
              <div className="space-y-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      const fakeEvent = {
                        target: { value: prompt },
                      } as React.ChangeEvent<HTMLInputElement>;
                      handleInputChange(fakeEvent);
                      setTimeout(() => {
                        const form = document.querySelector(
                          "#drawer-chat-form"
                        ) as HTMLFormElement;
                        if (form) form.requestSubmit();
                      }, 50);
                    }}
                    className="block w-full text-left px-3 py-2 text-xs border border-border rounded-lg hover:bg-accent/50 hover:border-primary/30 transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id}>
                  {message.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-3 py-1.5 max-w-[85%]">
                        <p className="text-xs">{message.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          code({ className, children, ...props }) {
                            const match = /language-(\w+)/.exec(
                              className || ""
                            );
                            const code = String(children).replace(/\n$/, "");

                            if (match) {
                              const language = match[1];
                              const variables = language === "graphql"
                                ? findVariablesForQuery(message.content, code)
                                : undefined;
                              const playgroundHref = variables
                                ? `/playground?query=${encodeURIComponent(code)}&variables=${encodeURIComponent(variables)}`
                                : `/playground?query=${encodeURIComponent(code)}`;

                              return (
                                <div className="my-2">
                                  <CodeBlock
                                    code={code}
                                    language={language}
                                    title={
                                      language === "graphql"
                                        ? "Query"
                                        : language === "json"
                                        ? "Variables"
                                        : undefined
                                    }
                                  />
                                  {language === "graphql" && (
                                    <div className="mt-1">
                                      <Link
                                        href={playgroundHref}
                                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                        onClick={onClose}
                                      >
                                        <Play className="h-3 w-3" />
                                        Try in Playground
                                      </Link>
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            return (
                              <code
                                className="bg-muted px-1 py-0.5 rounded text-xs font-mono"
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          },
                          p({ children }) {
                            return (
                              <p className="text-xs leading-relaxed mb-2">
                                {children}
                              </p>
                            );
                          },
                          h3({ children }) {
                            return (
                              <h3 className="text-sm font-semibold mt-3 mb-1">
                                {children}
                              </h3>
                            );
                          },
                          ul({ children }) {
                            return (
                              <ul className="list-disc pl-4 space-y-0.5 text-xs mb-2">
                                {children}
                              </ul>
                            );
                          },
                          ol({ children }) {
                            return (
                              <ol className="list-decimal pl-4 space-y-0.5 text-xs mb-2">
                                {children}
                              </ol>
                            );
                          },
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Thinking...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border px-4 py-3 flex-shrink-0">
          <form
            id="drawer-chat-form"
            onSubmit={handleSubmit}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Ask about the API..."
              className="flex-1 px-3 py-1.5 text-xs border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1 text-xs"
            >
              <Send className="h-3 w-3" />
            </button>
          </form>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            AI-generated queries should be validated before production use.
          </p>
        </div>
      </div>
    </>
  );
}
