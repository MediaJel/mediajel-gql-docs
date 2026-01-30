"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Send,
  Plus,
  Minus,
  ChevronDown,
  ChevronRight,
  Clock,
  History,
  X,
} from "lucide-react";
import { Highlight, themes } from "prism-react-renderer";
import {
  RequestHistory,
  HistoryEntry,
  loadHistory,
  saveHistory,
  addHistoryEntry,
} from "./request-history";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

function methodColor(method: string) {
  switch (method) {
    case "GET": return "bg-blue-600";
    case "POST": return "bg-green-600";
    case "PUT": return "bg-amber-600";
    case "PATCH": return "bg-orange-600";
    case "DELETE": return "bg-red-600";
    default: return "bg-gray-600";
  }
}

function statusBadge(status: number) {
  if (status < 300) return "bg-green-100 text-green-800 border-green-200";
  if (status < 400) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
}

interface HeaderRow {
  key: string;
  value: string;
  enabled: boolean;
}

interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
}

interface HttpClientProps {
  auth: { accessToken: string; orgId: string };
  gqlEndpoint: string;
  defaultBody?: string;
}

const DEFAULT_BODY = JSON.stringify(
  {
    query: "query { orgs(first: 5) { id name } }",
    variables: {},
  },
  null,
  2
);

export function HttpClient({ auth, gqlEndpoint, defaultBody }: HttpClientProps) {
  const [method, setMethod] = useState<HttpMethod>("POST");
  const [url, setUrl] = useState(gqlEndpoint);
  const [headers, setHeaders] = useState<HeaderRow[]>([
    { key: "Authorization", value: `Bearer ${auth.accessToken}`, enabled: true },
    { key: "Key", value: auth.orgId, enabled: true },
    { key: "Content-Type", value: "application/json", enabled: true },
  ]);
  const [body, setBody] = useState(defaultBody || DEFAULT_BODY);
  const [response, setResponse] = useState<HttpResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [headersOpen, setHeadersOpen] = useState(true);
  const [bodyOpen, setBodyOpen] = useState(true);
  const [responseHeadersOpen, setResponseHeadersOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Sync auth headers when auth changes
  useEffect(() => {
    setHeaders((prev) =>
      prev.map((h) => {
        if (h.key === "Authorization") return { ...h, value: `Bearer ${auth.accessToken}` };
        if (h.key === "Key") return { ...h, value: auth.orgId };
        return h;
      })
    );
  }, [auth.accessToken, auth.orgId]);

  // Load history on mount
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const hasBody = method === "POST" || method === "PUT" || method === "PATCH";

  const addHeader = () => {
    setHeaders([...headers, { key: "", value: "", enabled: true }]);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const updateHeader = (index: number, field: keyof HeaderRow, value: string | boolean) => {
    setHeaders(
      headers.map((h, i) => (i === index ? { ...h, [field]: value } : h))
    );
  };

  const sendRequest = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    const activeHeaders: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.enabled && h.key.trim()) {
        activeHeaders[h.key.trim()] = h.value;
      }
    });

    const start = performance.now();

    try {
      const fetchOpts: RequestInit = {
        method,
        headers: activeHeaders,
      };
      if (hasBody && body.trim()) {
        fetchOpts.body = body;
      }

      const res = await fetch(url, fetchOpts);
      const elapsed = performance.now() - start;

      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        resHeaders[k] = v;
      });

      let resBody: string;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("json")) {
        const json = await res.json();
        resBody = JSON.stringify(json, null, 2);
      } else {
        resBody = await res.text();
      }

      const httpResponse: HttpResponse = {
        status: res.status,
        statusText: res.statusText,
        headers: resHeaders,
        body: resBody,
        time: Math.round(elapsed),
      };
      setResponse(httpResponse);

      // Save to history
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        method,
        url,
        headers: activeHeaders,
        body: hasBody ? body : "",
        status: res.status,
        timestamp: Date.now(),
      };
      addHistoryEntry(entry);
      setHistory(loadHistory());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [method, url, headers, body, hasBody]);

  const loadFromHistory = (entry: HistoryEntry) => {
    setMethod(entry.method as HttpMethod);
    setUrl(entry.url);
    setBody(entry.body);
    const restoredHeaders: HeaderRow[] = Object.entries(entry.headers).map(
      ([key, value]) => ({ key, value, enabled: true })
    );
    if (restoredHeaders.length > 0) {
      setHeaders(restoredHeaders);
    }
    setHistoryOpen(false);
  };

  const clearHistory = () => {
    saveHistory([]);
    setHistory([]);
  };

  return (
    <div className="flex h-full">
      {/* History sidebar */}
      {historyOpen && (
        <div className="w-64 border-r border-border flex-shrink-0 bg-muted/30">
          <RequestHistory
            entries={history}
            onSelect={loadFromHistory}
            onClear={clearHistory}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar: method + url + send */}
        <div className="flex items-center gap-2 p-3 border-b border-border bg-card">
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className={`p-2 rounded-md border border-border hover:bg-accent transition-colors ${historyOpen ? "bg-accent" : ""}`}
            title="Toggle history"
          >
            <History className="h-4 w-4" />
          </button>

          <div className="relative">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as HttpMethod)}
              className={`appearance-none pl-3 pr-8 py-2 text-sm font-bold text-white rounded-l-md border-0 cursor-pointer ${methodColor(method)}`}
            >
              {HTTP_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <ChevronDown className="h-3 w-3 text-white/70 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter request URL"
            className="flex-1 px-3 py-2 text-sm font-mono border border-input rounded-r-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            onKeyDown={(e) => {
              if (e.key === "Enter") sendRequest();
            }}
          />

          <button
            onClick={sendRequest}
            disabled={loading || !url.trim()}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Send className={`h-4 w-4 ${loading ? "animate-pulse" : ""}`} />
            {loading ? "Sending..." : "Send"}
          </button>
        </div>

        {/* Request config + response */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border h-full">
            {/* Left: request config */}
            <div className="flex flex-col overflow-y-auto">
              {/* Headers */}
              <div className="border-b border-border">
                <button
                  onClick={() => setHeadersOpen(!headersOpen)}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium hover:bg-accent/50 transition-colors"
                >
                  {headersOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  Headers
                  <span className="text-xs text-muted-foreground ml-1">
                    ({headers.filter((h) => h.enabled && h.key.trim()).length})
                  </span>
                </button>
                {headersOpen && (
                  <div className="px-4 pb-3 space-y-2">
                    {headers.map((header, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={header.enabled}
                          onChange={(e) => updateHeader(i, "enabled", e.target.checked)}
                          className="rounded border-input"
                        />
                        <input
                          type="text"
                          value={header.key}
                          onChange={(e) => updateHeader(i, "key", e.target.value)}
                          placeholder="Header name"
                          className="flex-1 px-2 py-1 text-xs font-mono border border-input rounded bg-background"
                        />
                        <input
                          type="text"
                          value={header.value}
                          onChange={(e) => updateHeader(i, "value", e.target.value)}
                          placeholder="Value"
                          className="flex-1 px-2 py-1 text-xs font-mono border border-input rounded bg-background"
                        />
                        <button
                          onClick={() => removeHeader(i)}
                          className="p-1 text-muted-foreground hover:text-destructive"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addHeader}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="h-3 w-3" />
                      Add header
                    </button>
                  </div>
                )}
              </div>

              {/* Body */}
              {hasBody && (
                <div className="border-b border-border flex-1 flex flex-col">
                  <button
                    onClick={() => setBodyOpen(!bodyOpen)}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium hover:bg-accent/50 transition-colors"
                  >
                    {bodyOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    Body
                    <span className="text-xs text-muted-foreground ml-1">JSON</span>
                  </button>
                  {bodyOpen && (
                    <div className="px-4 pb-3 flex-1">
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        spellCheck={false}
                        className="w-full h-full min-h-[200px] px-3 py-2 text-xs font-mono border border-input rounded bg-background resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Request body (JSON)"
                      />
                    </div>
                  )}
                </div>
              )}

              {!hasBody && (
                <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                  {method} requests do not have a body.
                </div>
              )}
            </div>

            {/* Right: response */}
            <div className="flex flex-col overflow-y-auto bg-muted/20">
              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-b border-red-200 text-sm text-red-700">
                  <X className="h-4 w-4" />
                  {error}
                </div>
              )}

              {!response && !error && !loading && (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  <div className="text-center">
                    <Send className="h-8 w-8 mx-auto mb-3 opacity-20" />
                    <p>Send a request to see the response</p>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  <div className="text-center">
                    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p>Sending request...</p>
                  </div>
                </div>
              )}

              {response && (
                <>
                  {/* Status bar */}
                  <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded border ${statusBadge(response.status)}`}>
                      {response.status} {response.statusText}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {response.time}ms
                    </span>
                  </div>

                  {/* Response headers */}
                  <div className="border-b border-border">
                    <button
                      onClick={() => setResponseHeadersOpen(!responseHeadersOpen)}
                      className="flex items-center gap-2 w-full px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent/50 transition-colors"
                    >
                      {responseHeadersOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      Response Headers ({Object.keys(response.headers).length})
                    </button>
                    {responseHeadersOpen && (
                      <div className="px-4 pb-2">
                        {Object.entries(response.headers).map(([k, v]) => (
                          <div key={k} className="flex gap-2 text-[11px] font-mono py-0.5">
                            <span className="text-muted-foreground font-medium">{k}:</span>
                            <span className="break-all">{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Response body */}
                  <div className="flex-1 overflow-auto">
                    <div className="px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                      Response Body
                    </div>
                    <Highlight theme={themes.vsLight} code={response.body} language="json">
                      {({ style, tokens, getLineProps, getTokenProps }) => (
                        <pre
                          className="px-4 py-3 text-xs overflow-auto"
                          style={{ ...style, background: "transparent", margin: 0 }}
                        >
                          {tokens.map((line, i) => (
                            <div key={i} {...getLineProps({ line })}>
                              {line.map((token, key) => (
                                <span key={key} {...getTokenProps({ token })} />
                              ))}
                            </div>
                          ))}
                        </pre>
                      )}
                    </Highlight>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
