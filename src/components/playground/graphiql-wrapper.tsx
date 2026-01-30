"use client";

import { useMemo } from "react";
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

  return (
    <div className="h-full">
      <GraphiQL
        fetcher={fetcher}
        defaultQuery={defaultQuery || DEFAULT_QUERY}
        variables={defaultVariables}
      />
    </div>
  );
}
