"use client";

import { useState, useCallback, useEffect } from "react";
import { Play, X, CheckCircle, LogOut, Code2, Globe } from "lucide-react";
import { AuthForm } from "./auth-form";
import { GraphiQLWrapper } from "./graphiql-wrapper";
import { HttpClient } from "./http-client";
import "graphiql/graphiql.css";

const STORAGE_KEY = "mediajel_playground_auth";

interface PlaygroundDrawerProps {
  open: boolean;
  onClose: () => void;
  query?: string;
  variables?: string;
  mode?: "graphql" | "http";
}

export function PlaygroundDrawer({
  open,
  onClose,
  query,
  variables,
  mode = "graphql",
}: PlaygroundDrawerProps) {
  const gqlEndpoint =
    process.env.NEXT_PUBLIC_GQL_ENDPOINT || "http://localhost:4000";

  const [auth, setAuth] = useState<{
    accessToken: string;
    orgId: string;
  } | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [activeTab, setActiveTab] = useState(mode);

  // Sync activeTab when mode prop changes (e.g. different button clicked)
  useEffect(() => {
    setActiveTab(mode);
  }, [mode]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.accessToken && data.orgId) {
          setAuth({ accessToken: data.accessToken, orgId: data.orgId });
        }
      }
    } catch (err) {
      console.error("Failed to restore session:", err);
    } finally {
      setIsRestoring(false);
    }
  }, []);

  const handleAuthenticated = useCallback(
    (
      tokens: {
        accessToken: string;
        idToken: string | null;
        refreshToken: string | null;
      },
      orgId: string,
      credentials?: { username: string }
    ) => {
      const authData = { accessToken: tokens.accessToken, orgId };
      setAuth(authData);
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            ...authData,
            username: credentials?.username,
            savedAt: Date.now(),
          })
        );
      } catch (err) {
        console.error("Failed to save session:", err);
      }
    },
    []
  );

  const handleLogout = useCallback(() => {
    setAuth(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error("Failed to clear session:", err);
    }
  }, []);

  // Build HTTP body from query + variables
  const httpBody = query
    ? JSON.stringify(
        {
          query,
          variables: variables ? JSON.parse(variables) : {},
        },
        null,
        2
      )
    : undefined;

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
        className={`fixed top-0 right-0 h-full w-[80vw] max-w-[900px] bg-background border-l border-border z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Playground</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {open && (
            <>
              {!auth ? (
                isRestoring ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Loading...
                  </div>
                ) : (
                  <>
                    <AuthForm onAuthenticated={handleAuthenticated} gqlEndpoint={gqlEndpoint} />
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <p className="text-lg font-medium mb-2">Authenticate to start querying</p>
                        <p className="text-sm">
                          Enter your Cognito credentials and organization ID above.
                        </p>
                      </div>
                    </div>
                  </>
                )
              ) : (
                <>
                  {/* Auth bar */}
                  <div className="flex items-center justify-between px-4 py-2 bg-green-50 border-b border-green-200 flex-shrink-0">
                    <div className="flex items-center gap-2 text-sm text-green-800">
                      <CheckCircle className="h-4 w-4" />
                      Authenticated as org: <code className="font-mono">{auth.orgId}</code>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign out
                    </button>
                  </div>

                  {/* Tab bar */}
                  <div className="flex border-b border-border bg-card px-4 flex-shrink-0">
                    <button
                      onClick={() => setActiveTab("graphql")}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === "graphql"
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Code2 className="h-3.5 w-3.5" />
                      GraphQL
                    </button>
                    <button
                      onClick={() => setActiveTab("http")}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === "http"
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Globe className="h-3.5 w-3.5" />
                      HTTP Client
                    </button>
                  </div>

                  {/* Tab panels */}
                  <div className="flex-1 min-h-0 relative">
                    <div className={`absolute inset-0 ${activeTab === "graphql" ? "" : "invisible pointer-events-none"}`}>
                      <GraphiQLWrapper
                        defaultQuery={query}
                        defaultVariables={variables}
                        auth={auth}
                        gqlEndpoint={gqlEndpoint}
                      />
                    </div>
                    <div className={`absolute inset-0 ${activeTab === "http" ? "" : "invisible pointer-events-none"}`}>
                      <HttpClient
                        auth={auth}
                        gqlEndpoint={gqlEndpoint}
                        defaultBody={httpBody}
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
