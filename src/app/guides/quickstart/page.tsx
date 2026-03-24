"use client";

import { CodeBlock } from "@/components/ui/code-block";
import { Term, TermInline } from "@/components/ui/term-tooltip";
import { AuthFlowDiagram } from "@/components/diagrams/auth-flow";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function QuickstartPage() {
  const gqlEndpoint =
    process.env.NEXT_PUBLIC_GQL_ENDPOINT || "http://localhost:4000";

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <h1 className="text-3xl font-bold mb-2">Quickstart</h1>
      <p className="text-muted-foreground mb-6">
        Go from credentials to your first <Term id="API">API</Term> call in
        under 5 minutes.
      </p>

      {/* Visual overview */}
      <AuthFlowDiagram className="mb-10" />

      {/* Step 1 */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
            1
          </div>
          <h2 className="text-xl font-semibold">Get your credentials</h2>
        </div>
        <p className="text-sm text-muted-foreground ml-11 mb-4">
          You&apos;ll use your MediaJel Dashboard login credentials:
        </p>
        <ul className="text-sm text-muted-foreground ml-11 list-disc pl-5 space-y-1 mb-4">
          <li>
            <strong>Username</strong> — Your MediaJel Dashboard username
          </li>
          <li>
            <strong>Password</strong> — Your MediaJel Dashboard password
          </li>
          <li>
            <strong>Organization ID</strong> — Your{" "}
            <Term id="organizationId">org ID</Term> (used as the{" "}
            <code className="bg-muted px-1 rounded">Key</code>{" "}
            <Term id="header">header</Term>). Your account manager can provide
            this if you don&apos;t know it.
          </li>
        </ul>
      </section>

      {/* Terminal Help for Beginners */}
      <details className="ml-11 mb-10 border border-border rounded-lg">
        <summary className="px-4 py-3 cursor-pointer text-sm font-medium hover:bg-muted/50">
          New to Terminal? Click here for help
        </summary>
        <div className="px-4 pb-4 text-sm text-muted-foreground space-y-3">
          <p>
            The examples below use <Term id="cURL">cURL</Term>, a command-line
            tool for making HTTP requests. Here&apos;s how to get started:
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              <strong>Open Terminal</strong> — On Mac, press{" "}
              <code className="bg-muted px-1 rounded">Cmd + Space</code>, type
              &quot;Terminal&quot;, and press Enter.
            </li>
            <li>
              <strong>Copy a command</strong> — Click the copy button on any
              code block below.
            </li>
            <li>
              <strong>Paste and run</strong> — In Terminal, press{" "}
              <code className="bg-muted px-1 rounded">Cmd + V</code> to paste,
              then press Enter to run.
            </li>
          </ol>
          <p className="text-xs border-l-2 border-primary/50 pl-3">
            <strong>Tip:</strong> The backslash{" "}
            <code className="bg-muted px-1 rounded">\</code> at the end of lines
            means the command continues on the next line. Copy the entire block,
            not just one line.
          </p>
        </div>
      </details>

      {/* Step 2 */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
            2
          </div>
          <h2 className="text-xl font-semibold">Authenticate</h2>
        </div>
        <p className="text-sm text-muted-foreground ml-11 mb-4">
          Call the <TermInline id="mutation">authSignIn</TermInline>{" "}
          <Term id="mutation">mutation</Term> to obtain{" "}
          <Term id="JWT">JWT</Term> tokens:
        </p>
        <div className="ml-11">
          <CodeBlock
            language="bash"
            title="cURL"
            code={`curl -X POST ${gqlEndpoint} \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "mutation { authSignIn(data: { username: \\"your@email.com\\", password: \\"your-password\\" }) { accessToken idToken refreshToken } }"
  }'`}
          />
        </div>
        <p className="text-sm text-muted-foreground ml-11 mt-4">
          The response includes three tokens:
        </p>
        <div className="ml-11 mt-2">
          <CodeBlock
            language="json"
            title="Response"
            code={`{
  "data": {
    "authSignIn": {
      "accessToken": "eyJraWQiOiJ...",
      "idToken": "eyJraWQiOiJ...",
      "refreshToken": "eyJjdHkiOiJ..."
    }
  }
}`}
          />
        </div>
        <ul className="text-sm text-muted-foreground ml-11 mt-3 list-disc pl-5 space-y-1">
          <li>
            <Term id="accessToken">accessToken</Term> — Use this in the{" "}
            <Term id="Authorization">Authorization</Term> header for API
            requests
          </li>
          <li>
            <Term id="idToken">idToken</Term> — Contains your user identity
            (not needed for API calls)
          </li>
          <li>
            <Term id="refreshToken">refreshToken</Term> — Use to get new tokens
            when they expire
          </li>
        </ul>
      </section>

      {/* Step 3 */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
            3
          </div>
          <h2 className="text-xl font-semibold">Make an authenticated request</h2>
        </div>
        <p className="text-sm text-muted-foreground ml-11 mb-4">
          Use the <TermInline id="accessToken">accessToken</TermInline> and your{" "}
          <Term id="organizationId">organization ID</Term> in subsequent
          requests:
        </p>
        <div className="ml-11">
          <CodeBlock
            language="bash"
            title="cURL — List Organizations"
            code={`curl -X POST ${gqlEndpoint} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer eyJraWQiOiJ..." \\
  -H "Key: your-org-id" \\
  -d '{
    "query": "{ orgs(first: 5) { id name slug enabled } }"
  }'`}
          />
        </div>
        <p className="text-xs text-muted-foreground ml-11 mt-3 border-l-2 border-primary/50 pl-3">
          <strong>Note:</strong> The <Term id="Bearer">Bearer</Term> prefix is
          required before your token. The <code className="bg-muted px-1 rounded">Key</code>{" "}
          header contains your organization ID.
        </p>
      </section>

      {/* Step 4 */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
            4
          </div>
          <h2 className="text-xl font-semibold">Explore the API</h2>
        </div>
        <p className="text-sm text-muted-foreground ml-11 mb-4">
          You&apos;re all set! Explore the available operations:
        </p>
        <div className="ml-11 grid grid-cols-2 gap-3">
          <Link
            href="/schema"
            className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
          >
            <h3 className="font-medium text-sm mb-1">API Reference</h3>
            <p className="text-xs text-muted-foreground">
              Browse all <Term id="query">queries</Term> and{" "}
              <Term id="mutation">mutations</Term>
            </p>
          </Link>
          <Link
            href="/playground"
            className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
          >
            <h3 className="font-medium text-sm mb-1">Playground</h3>
            <p className="text-xs text-muted-foreground">
              Test queries interactively
            </p>
          </Link>
        </div>
      </section>

      <div className="border-t border-border pt-6">
        <Link
          href="/guides/authentication"
          className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
        >
          Next: Authentication details
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
