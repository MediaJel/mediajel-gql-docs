"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useCallback, useEffect, useRef } from "react";
import { CheckCircle, LogOut, Globe, Code2 } from "lucide-react";
import { GraphiQLWrapper } from "@/components/playground/graphiql-wrapper";
import { AuthForm } from "@/components/playground/auth-form";
import { HttpClient } from "@/components/playground/http-client";

const AUTH_STORAGE_KEY = "mediajel_playground_auth";

const DEFAULT_QUERY = `# Welcome to the MediaJel API Playground!
# Start by authenticating above, then try a query:

query ListOrgs {
  orgs(first: 5) {
    id
    name
    website
    status
  }
}
`;

function PlaygroundContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("query") || DEFAULT_QUERY;
  const initialVariables = searchParams.get("variables") || "{}";

  const gqlEndpoint =
    process.env.NEXT_PUBLIC_GQL_ENDPOINT || "http://localhost:4000";

  const [auth, setAuth] = useState<{
    idToken: string;
    orgId: string;
  } | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [activeTab, setActiveTab] = useState("graphql");
  const didInit = useRef(false);

  // Shared state for query and variables - synced between GraphQL and HTTP Client tabs
  const [query, setQuery] = useState(initialQuery);
  const [variables, setVariables] = useState(initialVariables);

  // Restore session from URL params (embedded in dashboard) or localStorage.
  // Read URL params directly from window.location to avoid Suspense re-render cycles.
  useEffect(() => {
    if (didInit.current) {
      return;
    }
    didInit.current = true;

    const params = new URLSearchParams(window.location.search);
    const embeddedToken = params.get("token");
    const embeddedOrgId = params.get("orgId");
    const isEmbedded = params.get("embedded") === "true";

    // When embedded in the dashboard, use the token and orgId from URL params
    if (isEmbedded && embeddedToken && embeddedOrgId) {
      const authData = { idToken: embeddedToken, orgId: embeddedOrgId };
      setAuth(authData);
      try {
        localStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({ ...authData, savedAt: Date.now() })
        );
      } catch (err) {
        console.error("Failed to save embedded session:", err);
      }
      setIsRestoring(false);
      return;
    }

    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.idToken && data.orgId) {
          setAuth({ idToken: data.idToken, orgId: data.orgId });
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
      const authData = { idToken: tokens.idToken as string, orgId };
      setAuth(authData);
      try {
        localStorage.setItem(
          AUTH_STORAGE_KEY,
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
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (err) {
      console.error("Failed to clear session:", err);
    }
  }, []);

  if (isRestoring) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading playground...
      </div>
    );
  }

  if (!auth) {
    return (
      <div className="flex flex-col h-full">
        <AuthForm onAuthenticated={handleAuthenticated} gqlEndpoint={gqlEndpoint} />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p className="text-lg font-medium mb-2">
              Authenticate to start querying
            </p>
            <p className="text-sm">
              Enter your Cognito credentials and organization ID above to use
              the playground.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Auth status bar */}
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
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "graphql"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Code2 className="h-4 w-4" />
          GraphQL Playground
        </button>
        <button
          onClick={() => setActiveTab("http")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "http"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Globe className="h-4 w-4" />
          HTTP Client
        </button>
      </div>

      {/* Tab panels — both always mounted, toggle with CSS to preserve state */}
      <div className="flex-1 min-h-0 relative">
        <div className={`absolute inset-0 ${activeTab === "graphql" ? "" : "invisible pointer-events-none"}`}>
          <GraphiQLWrapper
            query={query}
            variables={variables}
            onEditQuery={setQuery}
            onEditVariables={setVariables}
            auth={auth}
            gqlEndpoint={gqlEndpoint}
          />
        </div>
        <div className={`absolute inset-0 ${activeTab === "http" ? "" : "invisible pointer-events-none"}`}>
          <HttpClient
            auth={auth}
            gqlEndpoint={gqlEndpoint}
            query={query}
            variables={variables}
            onQueryChange={setQuery}
            onVariablesChange={setVariables}
          />
        </div>
      </div>
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Loading playground...
        </div>
      }
    >
      <PlaygroundContent />
    </Suspense>
  );
}
