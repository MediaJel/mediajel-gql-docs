import { CodeBlock } from "@/components/ui/code-block";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function AuthenticationPage() {
  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <h1 className="text-3xl font-bold mb-2">Authentication</h1>
      <p className="text-muted-foreground mb-8">
        The MediaJel API uses AWS Cognito for authentication. All API requests
        (except <code className="bg-muted px-1 rounded">authSignIn</code>)
        require a valid JWT token and organization ID.
      </p>

      {/* Auth flow */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Authentication Flow</h2>
        <div className="border border-border rounded-lg p-5 bg-muted/30 mb-4">
          <ol className="text-sm space-y-3">
            <li className="flex gap-3">
              <span className="font-bold text-primary">1.</span>
              <span>
                Call <code className="bg-muted px-1 rounded">authSignIn</code>{" "}
                with your username and password
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">2.</span>
              <span>
                Receive <code className="bg-muted px-1 rounded">accessToken</code>
                , <code className="bg-muted px-1 rounded">idToken</code>, and{" "}
                <code className="bg-muted px-1 rounded">refreshToken</code>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">3.</span>
              <span>
                Include tokens in headers for all subsequent requests
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">4.</span>
              <span>Refresh tokens when they expire (~1 hour)</span>
            </li>
          </ol>
        </div>
      </section>

      {/* Required headers */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Required Headers</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Every authenticated request must include two headers:
        </p>
        <div className="border border-border rounded-lg overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-2 font-medium">Header</th>
                <th className="text-left px-4 py-2 font-medium">Value</th>
                <th className="text-left px-4 py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="px-4 py-2 font-mono text-sm">Authorization</td>
                <td className="px-4 py-2 font-mono text-sm text-primary">
                  Bearer &lt;accessToken&gt;
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  JWT access token from authSignIn
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-sm">Key</td>
                <td className="px-4 py-2 font-mono text-sm text-primary">
                  &lt;organizationId&gt;
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  Your organization&apos;s unique ID
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Sign in example */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Sign In</h2>
        <CodeBlock
          language="graphql"
          title="authSignIn Mutation"
          code={`mutation SignIn($data: AuthSignInInput!) {
  authSignIn(data: $data) {
    accessToken
    idToken
    refreshToken
  }
}`}
        />
        <div className="mt-3">
          <CodeBlock
            language="json"
            title="Variables"
            code={`{
  "data": {
    "username": "developer@example.com",
    "password": "your-password"
  }
}`}
          />
        </div>
      </section>

      {/* Token lifecycle */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Token Lifecycle</h2>
        <div className="border border-border rounded-lg overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-2 font-medium">Token</th>
                <th className="text-left px-4 py-2 font-medium">Lifetime</th>
                <th className="text-left px-4 py-2 font-medium">Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="px-4 py-2 font-mono text-sm">accessToken</td>
                <td className="px-4 py-2">~1 hour</td>
                <td className="px-4 py-2 text-muted-foreground">
                  Used in Authorization header for API requests
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-2 font-mono text-sm">idToken</td>
                <td className="px-4 py-2">~1 hour</td>
                <td className="px-4 py-2 text-muted-foreground">
                  Contains user identity claims (not used for API auth)
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-sm">refreshToken</td>
                <td className="px-4 py-2">30 days</td>
                <td className="px-4 py-2 text-muted-foreground">
                  Used to obtain new access tokens without re-authenticating
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Error handling */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Authentication Errors</h2>
        <div className="space-y-3">
          <div className="border border-border rounded-lg p-4">
            <code className="text-sm font-mono text-destructive">
              Not authorized
            </code>
            <p className="text-sm text-muted-foreground mt-1">
              Invalid or expired access token. Re-authenticate or refresh your
              token.
            </p>
          </div>
          <div className="border border-border rounded-lg p-4">
            <code className="text-sm font-mono text-destructive">
              New password required
            </code>
            <p className="text-sm text-muted-foreground mt-1">
              Your account requires a password change. Contact your
              administrator.
            </p>
          </div>
        </div>
      </section>

      <div className="border-t border-border pt-6">
        <Link
          href="/guides/rate-limits"
          className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
        >
          Next: Rate Limits
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
