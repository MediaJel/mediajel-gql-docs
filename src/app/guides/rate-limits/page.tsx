import { CodeBlock } from "@/components/ui/code-block";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function RateLimitsPage() {
  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <h1 className="text-3xl font-bold mb-2">Rate Limits</h1>
      <p className="text-muted-foreground mb-8">
        The MediaJel API enforces rate limits to ensure fair usage and platform
        stability.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Limits</h2>
        <div className="border border-border rounded-lg p-5 bg-muted/30">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">60</div>
            <div className="text-sm text-muted-foreground">
              requests per minute per organization
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Rate limits are keyed by the{" "}
          <code className="bg-muted px-1 rounded">Key</code> header (your
          organization ID). All requests from the same organization share a
          single rate limit window, so several scripts running at once draw
          down the same budget.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Handling 429 Responses</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Exceed the limit and the API returns{" "}
          <code className="bg-muted px-1 rounded">429 Too Many Requests</code>.
          Responses do not carry{" "}
          <code className="bg-muted px-1 rounded">X-RateLimit-*</code> or{" "}
          <code className="bg-muted px-1 rounded">Retry-After</code> headers, so
          your client cannot read its remaining budget — track your own request
          rate rather than relying on the response to tell you.
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          On a 429, back off and retry with an increasing delay. Doubling the
          wait after each failure, starting around one second, recovers reliably
          without stalling a batch job:
        </p>
        <CodeBlock
          language="javascript"
          title="Retry with exponential backoff"
          code={`async function query(body, attempt = 0) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: \`Bearer \${idToken}\`,
      Key: orgId,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429 && attempt < 5) {
    await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));
    return query(body, attempt + 1);
  }

  return res.json();
}`}
        />
        <p className="text-sm text-muted-foreground mt-4">
          Running requests sequentially rather than in parallel avoids most rate
          limiting. If you are pulling a large result set, prefer paginating one
          page at a time over firing concurrent requests.
        </p>
      </section>

      <div className="border-t border-border pt-6">
        <Link
          href="/guides/pagination"
          className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
        >
          Next: Pagination
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
