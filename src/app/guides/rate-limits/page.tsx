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
          single rate limit window.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Response Headers</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Every API response includes rate limit information in the headers:
        </p>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-2 font-medium">Header</th>
                <th className="text-left px-4 py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="px-4 py-2 font-mono text-sm">
                  X-RateLimit-Limit
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  Maximum requests allowed per window (60)
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-2 font-mono text-sm">
                  X-RateLimit-Remaining
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  Number of requests remaining in the current window
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-2 font-mono text-sm">
                  X-RateLimit-Reset
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  Unix timestamp when the rate limit window resets
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-sm">Retry-After</td>
                <td className="px-4 py-2 text-muted-foreground">
                  Seconds until you can retry (only present on 429 responses)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Handling 429 Responses</h2>
        <p className="text-sm text-muted-foreground mb-4">
          When you exceed the rate limit, the API returns a{" "}
          <code className="bg-muted px-1 rounded">429 Too Many Requests</code>{" "}
          response:
        </p>
        <CodeBlock
          language="json"
          title="429 Response"
          code={`{
  "errors": [
    {
      "message": "Rate limit exceeded. Maximum 60 requests per 60 seconds. Try again in 45 seconds.",
      "extensions": {
        "code": "RATE_LIMITED",
        "retryAfter": 45
      }
    }
  ]
}`}
        />
        <p className="text-sm text-muted-foreground mt-4">
          Best practice: Implement exponential backoff and respect the{" "}
          <code className="bg-muted px-1 rounded">Retry-After</code> header.
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
