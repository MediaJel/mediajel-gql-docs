"use client";

import { useChat } from "ai/react";
import { useState } from "react";
import {
  Send,
  MessageSquare,
  Loader2,
  Copy,
  Check,
  Play,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { CodeBlock } from "@/components/ui/code-block";
import Link from "next/link";

const STARTER_PROMPTS = [
  "How do I authenticate with the API?",
  "Show me how to list all campaigns for an organization",
  "How do I get campaign orders with pagination?",
  "What fields are available on the Org type?",
  "Show me a query to get a single campaign by ID",
];

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat();

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
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
                    <ReactMarkdown
                      components={{
                        code({ className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || "");
                          const code = String(children).replace(/\n$/, "");

                          if (match) {
                            const language = match[1];
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
                                {language === "graphql" && (
                                  <div className="mt-1">
                                    <Link
                                      href={`/playground?query=${encodeURIComponent(
                                        code
                                      )}`}
                                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
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
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking...
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
