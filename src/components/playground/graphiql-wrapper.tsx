"use client";

import { useMemo, useRef } from "react";
import { createGraphiQLFetcher } from "@graphiql/toolkit";
import dynamic from "next/dynamic";

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
  defaultQuery?: string;
  defaultVariables?: string;
  auth: { accessToken: string; orgId: string };
  gqlEndpoint: string;
}

const DEFAULT_QUERY = `# Welcome to the MediaJel API Playground!
# Start by authenticating above, then try a query:

query ListOrgs {
  orgs(first: 5) {
    id
    name
    slug
    enabled
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
  defaultQuery,
  defaultVariables,
  auth,
  gqlEndpoint,
}: GraphiQLWrapperProps) {
  const fetcher = useMemo(() => {
    return createGraphiQLFetcher({
      url: gqlEndpoint,
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        Key: auth.orgId,
      },
    });
  }, [auth, gqlEndpoint]);

  // Each mount gets its own memory storage so GraphiQL always uses defaultQuery
  const storage = useRef(createMemoryStorage()).current;

  return (
    <div className="h-full">
      <GraphiQL
        fetcher={fetcher}
        defaultQuery={defaultQuery || DEFAULT_QUERY}
        variables={defaultVariables}
        storage={storage}
      />
    </div>
  );
}
