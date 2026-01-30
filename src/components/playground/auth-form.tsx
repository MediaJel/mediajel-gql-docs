"use client";

import { useState, useEffect } from "react";
import { Lock, Loader2, XCircle } from "lucide-react";

interface AuthFormProps {
  onAuthenticated: (
    tokens: {
      accessToken: string;
      idToken: string | null;
      refreshToken: string | null;
    },
    orgId: string,
    credentials?: { username: string }
  ) => void;
  gqlEndpoint: string;
}

const STORAGE_KEY = "mediajel_playground_auth";

export function AuthForm({ onAuthenticated, gqlEndpoint }: AuthFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [orgId, setOrgId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved username and orgId from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.username) setUsername(data.username);
        if (data.orgId) setOrgId(data.orgId);
      }
    } catch (err) {
      console.error("Failed to load saved credentials:", err);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(gqlEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `mutation SignIn($data: AuthSignInInput!) {
            authSignIn(data: $data) {
              accessToken
              idToken
              refreshToken
            }
          }`,
          variables: {
            data: { username, password },
          },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        setError(result.errors[0]?.message || "Authentication failed");
        return;
      }

      const tokens = result.data?.authSignIn;
      if (!tokens?.accessToken) {
        setError("No access token received. Check your credentials.");
        return;
      }

      onAuthenticated(tokens, orgId, { username });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to connect to API"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3 p-4 bg-card border-b border-border">
      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mr-2">
        <Lock className="h-4 w-4" />
        Sign In
      </div>
      <div className="flex-1 max-w-48">
        <label className="text-xs text-muted-foreground block mb-1">
          Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="email@example.com"
          className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background"
          required
        />
      </div>
      <div className="flex-1 max-w-48">
        <label className="text-xs text-muted-foreground block mb-1">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background"
          required
        />
      </div>
      <div className="flex-1 max-w-48">
        <label className="text-xs text-muted-foreground block mb-1">
          Org ID (Key header)
        </label>
        <input
          type="text"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          placeholder="clx..."
          className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background"
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Lock className="h-3.5 w-3.5" />
        )}
        Authenticate
      </button>
      {error && (
        <div className="flex items-center gap-1 text-xs text-destructive">
          <XCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}
    </form>
  );
}
