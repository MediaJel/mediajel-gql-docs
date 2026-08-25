import { CodeBlock } from "@/components/ui/code-block";
import Link from "next/link";

export default function ErrorHandlingPage() {
  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <h1 className="text-3xl font-bold mb-2">Error Handling</h1>
      <p className="text-muted-foreground mb-8">
        The MediaJel API returns errors in the standard GraphQL format. Here&apos;s
        how to handle them.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Error Response Format</h2>
        <p className="text-sm text-muted-foreground mb-4">
          GraphQL errors are returned in the{" "}
          <code className="bg-muted px-1 rounded">errors</code> array alongside
          any partial <code className="bg-muted px-1 rounded">data</code>:
        </p>
        <CodeBlock
          language="json"
          title="Error Response"
          code={`{
  "data": null,
  "errors": [
    {
      "message": "Not Authorised!",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["org"]
    }
  ]
}`}
        />
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Common Error Codes</h2>
        <div className="space-y-4">
          <div className="border border-border rounded-lg p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-sm font-medium bg-red-100 text-red-800 px-2 py-0.5 rounded">
                200
              </span>
              <h3 className="font-semibold">Not Authorised!</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Returned with HTTP 200 and{" "}
              <code className="bg-muted px-1 rounded">data: null</code> — check
              the <code className="bg-muted px-1 rounded">errors</code> array,
              not the status code.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Fix:</strong> Most often the wrong token — send the{" "}
              <code className="bg-muted px-1 rounded">idToken</code>, not the{" "}
              <code className="bg-muted px-1 rounded">accessToken</code>.
              Otherwise the token has expired (re-authenticate with{" "}
              <code className="bg-muted px-1 rounded">authSignIn</code>), or the{" "}
              <code className="bg-muted px-1 rounded">Key</code> header does not
              match an organization on your account.
            </p>
          </div>

          <div className="border border-border rounded-lg p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-sm font-medium bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                429
              </span>
              <h3 className="font-semibold">Rate Limited</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              You&apos;ve exceeded 60 requests per minute for your organization.
              This is a real HTTP status, unlike the errors above.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Fix:</strong> Back off and retry with an increasing delay.
              Responses carry no{" "}
              <code className="bg-muted px-1 rounded">Retry-After</code> header,
              so choose your own interval — see{" "}
              <Link
                href="/guides/rate-limits"
                className="text-primary hover:underline"
              >
                Rate Limits
              </Link>
              .
            </p>
          </div>

          <div className="border border-border rounded-lg p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-sm font-medium bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                400
              </span>
              <h3 className="font-semibold">Validation Error</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Your query has syntax errors or invalid arguments.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Fix:</strong> Check the error message for details. Use the
              Playground for query validation.
            </p>
          </div>

          <div className="border border-border rounded-lg p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-sm font-medium bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                200
              </span>
              <h3 className="font-semibold">Null result</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              A single-record lookup that matches nothing returns HTTP 200 with
              that field set to{" "}
              <code className="bg-muted px-1 rounded">null</code> and no{" "}
              <code className="bg-muted px-1 rounded">errors</code> array. There
              is no 404 — a missing record and a record outside your
              organization look identical.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Fix:</strong> Verify the ID and ensure your organization
              has access to it.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Best Practices</h2>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-2">
          <li>
            Always check for the <code className="bg-muted px-1 rounded">errors</code>{" "}
            array in GraphQL responses — the HTTP status may still be 200.
          </li>
          <li>
            Implement token refresh logic that detects &quot;Not Authorised!&quot;
            errors and automatically re-authenticates.
          </li>
          <li>
            Use the <code className="bg-muted px-1 rounded">path</code> field in
            errors to identify which field caused the issue.
          </li>
          <li>
            Log error responses for debugging but never log tokens or
            credentials.
          </li>
          <li>
            Implement retry logic with exponential backoff for transient errors
            (5xx, rate limits).
          </li>
        </ul>
      </section>

      <div className="border-t border-border pt-6">
        <div className="flex gap-4">
          <Link
            href="/schema"
            className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
          >
            Explore the API Reference
          </Link>
          <Link
            href="/playground"
            className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
          >
            Try the Playground
          </Link>
        </div>
      </div>
    </div>
  );
}
