"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import { createGraphiQLFetcher, isAsyncIterable, Fetcher } from "@graphiql/toolkit";
import dynamic from "next/dynamic";
import { ExportDropdown } from "./export-dropdown";

// Helper to detect introspection queries (fields starting with __)
function isIntrospectionQuery(query: string): boolean {
  return query.includes('__schema') || query.includes('__type');
}

// Helper to check if value is an Observable
function isObservable(value: unknown): value is { subscribe: (observer: unknown) => unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'subscribe' in value &&
    typeof (value as { subscribe: unknown }).subscribe === 'function'
  );
}

// Dynamic import GraphiQL to avoid SSR issues
const GraphiQL = dynamic(() => import("graphiql").then((m) => m.GraphiQL || m.default), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      Loading playground...
    </div>
  ),
});

interface GraphiQLWrapperProps {
  query?: string;
  variables?: string;
  onEditQuery?: (query: string) => void;
  onEditVariables?: (variables: string) => void;
  auth: { accessToken: string; orgId: string };
  gqlEndpoint: string;
}

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

/**
 * In-memory storage that prevents GraphiQL from reading/writing to localStorage.
 * Without this, GraphiQL ignores `defaultQuery` whenever it finds a previously
 * saved query in localStorage — which breaks the "Try in Playground" feature.
 */
function createMemoryStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    get length() { return Object.keys(store).length; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  };
}

export function GraphiQLWrapper({
  query,
  variables,
  onEditQuery,
  onEditVariables,
  auth,
  gqlEndpoint,
}: GraphiQLWrapperProps) {
  const [lastResponse, setLastResponse] = useState<unknown>(null);
  const [currentQuery, setCurrentQuery] = useState(query || DEFAULT_QUERY);

  // Create a fetcher that captures the response
  const fetcher: Fetcher = useMemo(() => {
    const baseFetcher = createGraphiQLFetcher({
      url: gqlEndpoint,
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        Key: auth.orgId,
      },
    });

    // Wrap the fetcher to capture responses (but not schema introspection)
    const wrappedFetcher: Fetcher = async (...args: Parameters<typeof baseFetcher>) => {
      // Check if this is an introspection query by examining the query string
      const params = args[0] as { query?: string } | undefined;
      const queryString = params?.query || '';

      // Skip response capture for introspection queries
      if (isIntrospectionQuery(queryString)) {
        return baseFetcher(...args);
      }

      const result = await baseFetcher(...args);

      // Handle Observable (subscriptions) - wrap to capture responses
      if (isObservable(result)) {
        return {
          subscribe: (observer: { next?: (value: unknown) => void; error?: (err: unknown) => void; complete?: () => void }) => {
            return result.subscribe({
              next: (value: unknown) => {
                setLastResponse(value);
                observer.next?.(value);
              },
              error: observer.error,
              complete: observer.complete,
            });
          },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
      }

      // Handle AsyncIterable (streaming/multipart responses)
      if (isAsyncIterable(result)) {
        const capturedResult = result;
        return (async function* () {
          for await (const value of capturedResult) {
            setLastResponse(value);
            yield value;
          }
        })();
      }

      // Handle Promise/direct result (standard query/mutation)
      if (result && typeof result === 'object') {
        setLastResponse(result);
      }

      return result;
    };

    return wrappedFetcher;
  }, [auth, gqlEndpoint]);

  // Track query changes
  const handleEditQuery = useCallback((newQuery: string) => {
    setCurrentQuery(newQuery);
    onEditQuery?.(newQuery);
  }, [onEditQuery]);

  // Each mount gets its own memory storage so GraphiQL always uses defaultQuery
  const storage = useRef(createMemoryStorage()).current;

  return (
    <div className="h-full flex flex-col">
      {/* Export toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
        <span className="text-xs font-medium text-muted-foreground">
          GraphiQL Editor
        </span>
        <div className="flex items-center gap-2">
          {lastResponse !== null && (
            <span className="text-xs text-muted-foreground">
              Response ready
            </span>
          )}
          <ExportDropdown
            data={lastResponse ? JSON.stringify(lastResponse) : ""}
            queryString={currentQuery}
            disabled={lastResponse === null}
          />
        </div>
      </div>

      {/* GraphiQL */}
      <div className="flex-1 min-h-0">
        <GraphiQL
          fetcher={fetcher}
          query={query || DEFAULT_QUERY}
          variables={variables}
          onEditQuery={handleEditQuery}
          onEditVariables={onEditVariables}
          storage={storage}
        />
      </div>
    </div>
  );
}
