import Link from "next/link";
import {
  BookOpen,
  Play,
  MessageSquare,
  Zap,
  KeyRound,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4">MediaJel API Documentation</h1>
        <p className="text-lg text-muted-foreground">
          Build integrations with the MediaJel advertising platform using our
          GraphQL API. Manage organizations, campaigns, and campaign orders
          programmatically.
        </p>
      </div>

      {/* Quick start cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        <Link
          href="/guides/quickstart"
          className="group border border-border rounded-lg p-6 hover:border-primary/50 hover:bg-accent/50 transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <Zap className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold">Quickstart</h2>
            <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-sm text-muted-foreground">
            Get from credentials to your first API call in under 5 minutes.
          </p>
        </Link>

        <Link
          href="/guides/authentication"
          className="group border border-border rounded-lg p-6 hover:border-primary/50 hover:bg-accent/50 transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <KeyRound className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold">Authentication</h2>
            <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-sm text-muted-foreground">
            Learn how to authenticate with Cognito credentials and manage JWT
            tokens.
          </p>
        </Link>

        <Link
          href="/schema"
          className="group border border-border rounded-lg p-6 hover:border-primary/50 hover:bg-accent/50 transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold">API Reference</h2>
            <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-sm text-muted-foreground">
            Explore all available queries and mutations with full type
            documentation.
          </p>
        </Link>

        <Link
          href="/playground"
          className="group border border-border rounded-lg p-6 hover:border-primary/50 hover:bg-accent/50 transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <Play className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold">Playground</h2>
            <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-sm text-muted-foreground">
            Test queries interactively with full autocompletion and auth
            integration.
          </p>
        </Link>
      </div>

      {/* API endpoint info */}
      <div className="border border-border rounded-lg p-6 bg-card">
        <h3 className="font-semibold mb-3">API Endpoint</h3>
        <code className="bg-muted px-3 py-2 rounded text-sm block mb-4">
          POST https://api.mediajel.com
        </code>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            <strong>Required headers:</strong>
          </p>
          <code className="bg-muted px-2 py-1 rounded text-xs block">
            Authorization: Bearer &lt;accessToken&gt;
          </code>
          <code className="bg-muted px-2 py-1 rounded text-xs block">
            Key: &lt;organizationId&gt;
          </code>
        </div>
      </div>

      {/* AI Assistant callout */}
      <div className="mt-8 border border-primary/20 rounded-lg p-6 bg-primary/5">
        <div className="flex items-center gap-3 mb-3">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Need help building a query?</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Our AI assistant can help you construct GraphQL queries from natural
          language descriptions. Just describe what data you need.
        </p>
        <Link
          href="/assistant"
          className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
        >
          Try the AI Assistant
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
