import { CodeBlock } from "@/components/ui/code-block";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function PaginationPage() {
  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <h1 className="text-3xl font-bold mb-2">Pagination</h1>
      <p className="text-muted-foreground mb-8">
        The MediaJel API supports two pagination styles: offset-based and
        cursor-based.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Offset Pagination</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Use <code className="bg-muted px-1 rounded">first</code> and{" "}
          <code className="bg-muted px-1 rounded">skip</code> for simple
          offset-based pagination:
        </p>
        <CodeBlock
          language="graphql"
          title="Offset Pagination"
          code={`# Page 1: first 10 items
query {
  campaigns(first: 10, skip: 0, orderBy: createdAt_DESC) {
    id
    name
    status
  }
}

# Page 2: next 10 items
query {
  campaigns(first: 10, skip: 10, orderBy: createdAt_DESC) {
    id
    name
    status
  }
}`}
        />
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">
          Cursor-Based Pagination (Connection)
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          For stable pagination on large datasets, use{" "}
          <code className="bg-muted px-1 rounded">Connection</code> queries
          with cursors:
        </p>
        <CodeBlock
          language="graphql"
          title="First Page"
          code={`query {
  orgsConnection(first: 10) {
    edges {
      node {
        id
        name
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    aggregate {
      count
    }
  }
}`}
        />
        <div className="mt-4">
          <CodeBlock
            language="graphql"
            title="Next Page (using endCursor)"
            code={`query {
  orgsConnection(first: 10, after: "cjx1234567890") {
    edges {
      node {
        id
        name
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}`}
          />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Pagination Parameters</h2>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-2 font-medium">Parameter</th>
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-left px-4 py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="px-4 py-2 font-mono">first</td>
                <td className="px-4 py-2 font-mono text-primary">Int</td>
                <td className="px-4 py-2 text-muted-foreground">
                  Number of items to return
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-2 font-mono">skip</td>
                <td className="px-4 py-2 font-mono text-primary">Int</td>
                <td className="px-4 py-2 text-muted-foreground">
                  Number of items to skip (offset)
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-2 font-mono">after</td>
                <td className="px-4 py-2 font-mono text-primary">String</td>
                <td className="px-4 py-2 text-muted-foreground">
                  Cursor for forward pagination
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-2 font-mono">before</td>
                <td className="px-4 py-2 font-mono text-primary">String</td>
                <td className="px-4 py-2 text-muted-foreground">
                  Cursor for backward pagination
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono">last</td>
                <td className="px-4 py-2 font-mono text-primary">Int</td>
                <td className="px-4 py-2 text-muted-foreground">
                  Number of items from the end
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Best Practices</h2>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-2">
          <li>
            Use cursor-based pagination for production integrations — it&apos;s
            stable even when data changes between requests.
          </li>
          <li>
            Keep page sizes reasonable (10-50 items). Very large pages may be
            slow.
          </li>
          <li>
            Always check <code className="bg-muted px-1 rounded">hasNextPage</code>{" "}
            before requesting the next page.
          </li>
          <li>
            Use <code className="bg-muted px-1 rounded">aggregate.count</code>{" "}
            from Connection queries to know the total dataset size.
          </li>
        </ul>
      </section>

      <div className="border-t border-border pt-6">
        <Link
          href="/guides/error-handling"
          className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
        >
          Next: Error Handling
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
