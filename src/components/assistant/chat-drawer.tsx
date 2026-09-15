"use client";

import { useChat } from "ai/react";
import { useEffect, useRef, useState } from "react";
import {
  Send,
  MessageSquare,
  Loader2,
  Play,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/components/ui/code-block";
import { PlaygroundDrawer } from "@/components/playground/playground-drawer";
import {
  getPlaygroundSession,
  runGraphQLQuery,
  isRunnableQuery,
} from "@/lib/playground-session";
import { QueryRun, QueryValidity } from "@/components/assistant/chat";

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
  const [hasSession, setHasSession] = useState(false);
  const [runnerTarget, setRunnerTarget] = useState<{
    query: string;
    variables?: string;
  } | null>(null);

  // Re-read when the drawer opens and when the Playground drawer closes, since
  // a same-tab localStorage write fires no storage event.
  useEffect(() => {
    setHasSession(getPlaygroundSession() !== null);
  }, [open, runnerTarget]);

  // Same configuration as the full-page assistant; without it this surface
  // silently loses tool calling and validation.
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      body: { hasSession },
      // describeType walks the type graph one type per step; measured chains
      // run 7-8 steps, and at 5 the browser stops before any prose arrives.
      maxSteps: 12,
      async onToolCall({ toolCall }) {
        // A tool call left without a result stalls the turn: the stream ends
        // on `tool-calls` with no text and the spinner never resolves.
        if (toolCall.toolName !== "runQuery") {
          return { ok: false, errors: [`Unhandled tool ${toolCall.toolName}`] };
        }
        const { query, variables } = toolCall.args as {
          query: string;
          variables?: Record<string, unknown>;
        };
        try {
          return await runGraphQLQuery(query, variables);
        } catch (error) {
          return {
            ok: false,
            errors: [error instanceof Error ? error.message : String(error)],
          };
        }
      },
    });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // One unchanging "Thinking..." reads as stuck on a slow provider; name the
  // stage instead so the wait is legible.
  const lastMessage = messages[messages.length - 1];
  const assistantStatus = (() => {
    if (lastMessage?.role !== "assistant") return "Finding the right operation...";
    if (lastMessage.toolInvocations?.some((t: { state: string }) => t.state !== "result"))
      return "Checking the schema...";
    if (lastMessage.content) return "Writing the answer...";
    return "Finding the right operation...";
  })();

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
                      <ReactMarkdown remarkPlugins={[remarkGfm]}
                        components={{
                        // `prose` is inert here (no typography plugin), so tables
                        // need their own styling or they render borderless.
                        table({ children }) {
                          return (
                            <div className="my-3 overflow-x-auto">
                              <table className="w-full border-collapse text-sm">
                                {children}
                              </table>
                            </div>
                          );
                        },
                        th({ children }) {
                          return (
                            <th className="border border-border bg-muted px-3 py-1.5 text-left font-medium">
                              {children}
                            </th>
                          );
                        },
                        td({ children }) {
                          return (
                            <td className="border border-border px-3 py-1.5 align-top">
                              {children}
                            </td>
                          );
                        },
                          code({ className, children, ...props }) {
                            const match = /language-(\w+)/.exec(
                              className || ""
                            );
                            const code = String(children).replace(/\n$/, "");

                            if (match) {
                              const language = match[1];
                              const runnable =
                              language === "graphql" && isRunnableQuery(code);
                            const variables = language === "graphql"
                                ? findVariablesForQuery(message.content, code)
                                : undefined;

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
                                  {runnable && (
                                    <QueryValidity code={code} ready={!isLoading} />
                                  )}
                                  {runnable && (
                                    <div className="mt-1">
                                      <button
                                        onClick={() =>
                                          setRunnerTarget({ query: code, variables })
                                        }
                                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                      >
                                        <Play className="h-3 w-3" />
                                        Try in Playground
                                      </button>
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
                  {message.toolInvocations
                    ?.filter((inv) => inv.toolName === "runQuery")
                    .map((inv) => (
                      <QueryRun key={inv.toolCallId} invocation={inv} />
                    ))}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {assistantStatus}
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

      {/* After the drawer, and in its own stacking context: both use z-50, so
          order alone would leave the playground behind the chat panel. */}
      <div className="relative z-[60]">
        {/* variables falls back to "{}" because the drawer ignores an
            undefined value and would keep the previous query's variables. */}
        <PlaygroundDrawer
          open={runnerTarget !== null}
          onClose={() => setRunnerTarget(null)}
          query={runnerTarget?.query}
          variables={runnerTarget?.variables || "{}"}
        />
      </div>
    </>
  );
}
