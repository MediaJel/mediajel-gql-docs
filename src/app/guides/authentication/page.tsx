import { CodeBlock } from "@/components/ui/code-block";
import { Term, TermInline } from "@/components/ui/term-tooltip";
import { AuthFlowDiagram } from "@/components/diagrams/auth-flow";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function AuthenticationPage() {
  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <h1 className="text-3xl font-bold mb-2">Authentication</h1>
      <p className="text-muted-foreground mb-8">
        The MediaJel <Term id="API">API</Term> uses{" "}
        <Term id="Cognito">AWS Cognito</Term> for authentication. All API
        requests (except <TermInline id="mutation">authSignIn</TermInline>)
        require a valid <Term id="JWT">JWT</Term> token and{" "}
        <Term id="organizationId">organization ID</Term>.
      </p>

      {/* Auth flow diagram */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Authentication Flow</h2>
        <AuthFlowDiagram variant="detailed" className="mb-4" />
        <p className="text-xs text-muted-foreground border-l-2 border-primary/50 pl-3">
          <strong>Summary:</strong> Sign in to get tokens, then include the{" "}
          <Term id="accessToken">accessToken</Term> in every request. Refresh
          when it expires (~1 hour).
        </p>
      </section>

      {/* Required headers */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Required Headers</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Every authenticated request must include two{" "}
          <Term id="header">headers</Term>:
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
                <td className="px-4 py-2 font-mono text-sm">
                  <Term id="Authorization">Authorization</Term>
                </td>
                <td className="px-4 py-2 font-mono text-sm text-primary">
                  <Term id="Bearer">Bearer</Term> &lt;accessToken&gt;
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  <Term id="JWT">JWT</Term> access token from authSignIn
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-sm">Key</td>
                <td className="px-4 py-2 font-mono text-sm text-primary">
                  &lt;organizationId&gt;
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  Your <Term id="organizationId">organization</Term>&apos;s
                  unique ID
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Sign in example */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Sign In</h2>
        <p className="text-sm text-muted-foreground mb-4">
          The <TermInline id="mutation">authSignIn</TermInline>{" "}
          <Term id="mutation">mutation</Term> accepts your credentials and
          returns tokens:
        </p>
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
        <p className="text-xs text-muted-foreground mt-3 border-l-2 border-primary/50 pl-3">
          <strong>Tip:</strong> <Term id="variable">Variables</Term> let you
          reuse the same <Term id="query">query</Term> with different values.
          Keep your password out of the query string.
        </p>
      </section>

      {/* Token lifecycle */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Token Lifecycle</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Each token serves a different purpose and has a different lifespan:
        </p>
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
                <td className="px-4 py-2 font-mono text-sm">
                  <Term id="accessToken">accessToken</Term>
                </td>
                <td className="px-4 py-2">~1 hour</td>
                <td className="px-4 py-2 text-muted-foreground">
                  Used in <Term id="Authorization">Authorization</Term> header
                  for API requests
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-2 font-mono text-sm">
                  <Term id="idToken">idToken</Term>
                </td>
                <td className="px-4 py-2">~1 hour</td>
                <td className="px-4 py-2 text-muted-foreground">
                  Contains user identity claims (not used for API auth)
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-sm">
                  <Term id="refreshToken">refreshToken</Term>
                </td>
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
        <p className="text-sm text-muted-foreground mb-4">
          Common authentication errors and how to fix them:
        </p>
        <div className="space-y-3">
          <div className="border border-border rounded-lg p-4">
            <code className="text-sm font-mono text-destructive">
              Not authorized
            </code>
            <p className="text-sm text-muted-foreground mt-1">
              Invalid or expired <Term id="accessToken">access token</Term>.
              Re-authenticate or refresh your token.
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
