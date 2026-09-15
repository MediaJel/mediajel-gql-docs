"use client";

import { useChat } from "ai/react";
import { useState, useEffect, useCallback } from "react";
import {
  Send,
  MessageSquare,
  Loader2,
  Copy,
  Check,
  Play,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/components/ui/code-block";
import { PlaygroundDrawer } from "@/components/playground/playground-drawer";
import {
  getPlaygroundSession,
  runGraphQLQuery,
  validateQuery,
  isRunnableQuery,
} from "@/lib/playground-session";

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
      // Look for the next json block
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
  "Show me how to list all campaigns for an organization",
  "How do I get campaign orders with pagination?",
  "What fields are available on the Org type?",
  "Show me a query to get a single campaign by ID",
];

/**
 * Checks a rendered query against the schema and flags it if it will not run.
 *
 * Canonical queries come straight from the config and always pass; this exists
 * for the ones the model composed itself, where a wrong field name would
 * otherwise reach the user looking authoritative.
 */
// react-markdown builds its `code` component fresh on every parent render, so
// these remount on each keystroke in the input. The schema is fixed at build
// time, so a query always validates the same way — check each one once.
const validationCache = new Map<string, string[]>();

export function QueryValidity({ code, ready }: { code: string; ready: boolean }) {
  const [errors, setErrors] = useState<string[] | null>(
    () => validationCache.get(code) ?? null
  );

  useEffect(() => {
    // A half-streamed block is always invalid. Validating it flashed a false
    // "this will fail" warning and cost one request per delta — ~100+ per answer.
    if (!ready) {
      setErrors(null);
      return;
    }
    const cached = validationCache.get(code);
    if (cached) {
      setErrors(cached);
      return;
    }
    let cancelled = false;
    validateQuery(code).then((result) => {
      validationCache.set(code, result);
      if (!cancelled) setErrors(result);
    });
    return () => {
      cancelled = true;
    };
  }, [code, ready]);

  if (!errors?.length) return null;


  return (
    <div className="mt-1 flex items-start gap-1.5 text-xs text-destructive">
      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
      <span>
        This query does not match the schema and will fail: {errors[0]}
      </span>
    </div>
  );
}

/** Shows the query the assistant ran and whether it came back clean. */
export function QueryRun({
  invocation,
}: {
  invocation: { state: string; args?: unknown; result?: unknown };
}) {
  const [open, setOpen] = useState(false);

  if (invocation.state !== "result") {
    return (
      <div className="my-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Running query…
      </div>
    );
  }

  const result = invocation.result as
    | { ok?: boolean; errors?: string[]; note?: string }
    | undefined;
  const failed = result?.ok === false;

  return (
    <div className="my-3 border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs bg-muted/40 hover:bg-muted/70 transition-colors"
      >
        <Play className="h-3 w-3 flex-shrink-0" />
        <span className="font-medium">
          {failed ? "Query failed" : "Ran a live query"}
        </span>
        <span className="ml-auto text-muted-foreground">
          {open ? "hide" : "details"}
        </span>
      </button>
      {open && (
        <div className="p-3 space-y-2">
          <CodeBlock
            code={JSON.stringify(invocation.args ?? {}, null, 2)}
            language="json"
            title="Sent"
          />
          <CodeBlock
            code={JSON.stringify(invocation.result ?? {}, null, 2)}
            language="json"
            title="Received"
          />
        </div>
      )}
      {failed && result?.errors?.length ? (
        <p className="px-3 pb-2 text-xs text-destructive">{result.errors[0]}</p>
      ) : null}
      {result?.note ? (
        <p className="px-3 pb-2 text-xs text-muted-foreground">{result.note}</p>
      ) : null}
    </div>
  );
}

export function Chat() {
  const [hasSession, setHasSession] = useState(false);
  const [runnerTarget, setRunnerTarget] = useState<{
    query: string;
    variables?: string;
  } | null>(null);

  // Re-read on mount, whenever the Playground drawer closes, and on focus.
  // Signing in inside that drawer writes localStorage, and a same-tab write
  // fires no storage event — without this the assistant kept telling a
  // just-signed-in user to go and sign in.
  useEffect(() => {
    const sync = () => setHasSession(getPlaygroundSession() !== null);
    sync();
    window.addEventListener("focus", sync);
    return () => window.removeEventListener("focus", sync);
  }, [runnerTarget]);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, reload } =
    useChat({
      body: {
        hasSession,
      },
      // Let the model run a query, read the result, and answer in one turn.
      // describeType walks the type graph one type per step; measured chains
      // run 7-8 steps, and at 5 the browser stops before any prose arrives.
      maxSteps: 12,
      // The query runs here rather than on the server so the viewer's token
      // stays in their browser.
      async onToolCall({ toolCall }) {
        // Every call must resolve to something. A tool call left without a
        // result stalls the turn: the stream ends on `tool-calls` with no
        // text, and the spinner runs until the next message.
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

  const handleNewConversation = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  // One unchanging "Thinking..." reads as stuck on a slow provider; name the
  // stage instead so the wait is legible.
  const lastMessage = messages[messages.length - 1];
  // A turn that ends on a tool call with no text leaves the panel silent;
  // surface it instead of looking hung until the next message.
  const stalled =
    lastMessage?.role === "assistant" &&
    !lastMessage.content &&
    (lastMessage.toolInvocations?.length ?? 0) > 0;

  const assistantStatus = (() => {
    if (lastMessage?.role !== "assistant") return "Finding the right operation...";
    if (lastMessage.toolInvocations?.some((t: { state: string }) => t.state !== "result"))
      return "Checking the schema...";
    if (lastMessage.content) return "Writing the answer...";
    return "Finding the right operation...";
  })();

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
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
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mx-auto mb-4">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold mb-2">AI Query Assistant</h2>
              <p className="text-muted-foreground">
                Ask me anything about the MediaJel API. I can help you build
                queries, understand types, and debug issues.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground mb-3">
                Try asking:
              </p>
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    const fakeEvent = {
                      target: { value: prompt },
                    } as React.ChangeEvent<HTMLInputElement>;
                    handleInputChange(fakeEvent);
                    // Submit after a tick to let state update
                    setTimeout(() => {
                      const form = document.querySelector(
                        "#chat-form"
                      ) as HTMLFormElement;
                      if (form) form.requestSubmit();
                    }, 50);
                  }}
                  className="block w-full text-left px-4 py-3 text-sm border border-border rounded-lg hover:bg-accent/50 hover:border-primary/30 transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex justify-end">
              <button
                onClick={handleNewConversation}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                New conversation
              </button>
            </div>
            {messages.map((message) => (
              <div key={message.id}>
                {message.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2 max-w-md">
                      <p className="text-sm">{message.content}</p>
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
                          const match = /language-(\w+)/.exec(className || "");
                          const code = String(children).replace(/\n$/, "");

                          if (match) {
                            const language = match[1];
                            const runnable =
                              language === "graphql" && isRunnableQuery(code);
                            const variables = language === "graphql"
                              ? findVariablesForQuery(message.content, code)
                              : undefined;

                            return (
                              <div className="my-3">
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
                              className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                        p({ children }) {
                          return (
                            <p className="text-sm leading-relaxed mb-3">
                              {children}
                            </p>
                          );
                        },
                        h3({ children }) {
                          return (
                            <h3 className="text-base font-semibold mt-4 mb-2">
                              {children}
                            </h3>
                          );
                        },
                        ul({ children }) {
                          return (
                            <ul className="list-disc pl-5 space-y-1 text-sm mb-3">
                              {children}
                            </ul>
                          );
                        },
                        ol({ children }) {
                          return (
                            <ol className="list-decimal pl-5 space-y-1 text-sm mb-3">
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {assistantStatus}
              </div>
            )}
            {!isLoading && stalled && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                That turn ended before an answer.
                <button
                  onClick={() => reload()}
                  className="text-primary hover:underline"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-card px-8 py-4">
        <form
          id="chat-form"
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto flex gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about the MediaJel API..."
            className="flex-1 px-4 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5 text-sm"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </button>
        </form>
        <p className="max-w-2xl mx-auto text-xs text-muted-foreground mt-2">
          AI-generated queries should be validated in the Playground before use
          in production.
        </p>
      </div>
    </div>
  );
}
