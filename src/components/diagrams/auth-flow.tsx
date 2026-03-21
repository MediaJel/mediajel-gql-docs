"use client";

import { cn } from "@/lib/utils";

interface AuthFlowDiagramProps {
  className?: string;
  variant?: "simple" | "detailed";
}

export function AuthFlowDiagram({
  className,
  variant = "simple",
}: AuthFlowDiagramProps) {
  if (variant === "detailed") {
    return <DetailedAuthFlow className={className} />;
  }
  return <SimpleAuthFlow className={className} />;
}

function SimpleAuthFlow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "border border-border rounded-lg bg-muted/30 p-6 overflow-x-auto",
        className
      )}
    >
      <div className="flex items-center justify-between min-w-[600px] gap-4">
        {/* Step 1 */}
        <div className="flex-1 text-center">
          <div className="bg-primary text-primary-foreground rounded-lg p-4 mb-3">
            <div className="text-xs font-medium opacity-80 mb-1">Step 1</div>
            <div className="font-semibold text-sm">Sign In</div>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="font-mono bg-muted px-2 py-1 rounded">
              authSignIn
            </div>
            <div>Send username + password</div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex-shrink-0 text-muted-foreground">
          <svg
            className="h-6 w-12"
            viewBox="0 0 48 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="0" y1="12" x2="40" y2="12" />
            <polyline points="34,6 40,12 34,18" />
          </svg>
        </div>

        {/* Step 2 */}
        <div className="flex-1 text-center">
          <div className="bg-green-600 text-white rounded-lg p-4 mb-3">
            <div className="text-xs font-medium opacity-80 mb-1">Step 2</div>
            <div className="font-semibold text-sm">Get Tokens</div>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="font-mono bg-muted px-2 py-1 rounded">
              accessToken
            </div>
            <div className="font-mono bg-muted px-2 py-1 rounded">
              refreshToken
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex-shrink-0 text-muted-foreground">
          <svg
            className="h-6 w-12"
            viewBox="0 0 48 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="0" y1="12" x2="40" y2="12" />
            <polyline points="34,6 40,12 34,18" />
          </svg>
        </div>

        {/* Step 3 */}
        <div className="flex-1 text-center">
          <div className="bg-purple-600 text-white rounded-lg p-4 mb-3">
            <div className="text-xs font-medium opacity-80 mb-1">Step 3</div>
            <div className="font-semibold text-sm">Make Requests</div>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="font-mono bg-muted px-2 py-1 rounded">
              Authorization: Bearer ...
            </div>
            <div className="font-mono bg-muted px-2 py-1 rounded">
              Key: org-id
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailedAuthFlow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "border border-border rounded-lg bg-muted/30 p-6 overflow-x-auto",
        className
      )}
    >
      <div className="min-w-[700px]">
        {/* Header row */}
        <div className="flex items-center gap-8 mb-6">
          <div className="flex-1 text-center">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Your App
            </div>
          </div>
          <div className="w-32" />
          <div className="flex-1 text-center">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              MediaJel API
            </div>
          </div>
        </div>

        {/* Step 1: Sign In Request */}
        <div className="flex items-center gap-8 mb-6">
          <div className="flex-1">
            <div className="bg-card border border-border rounded-lg p-3">
              <div className="text-xs font-medium text-primary mb-1">
                1. Sign In Request
              </div>
              <div className="font-mono text-xs bg-muted p-2 rounded">
                authSignIn(username, password)
              </div>
            </div>
          </div>
          <div className="w-32 flex items-center justify-center">
            <svg
              className="h-4 w-full text-primary"
              viewBox="0 0 100 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="0" y1="8" x2="90" y2="8" />
              <polyline points="84,2 90,8 84,14" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="bg-card border border-dashed border-border rounded-lg p-3 opacity-50">
              <div className="text-xs text-muted-foreground">
                Validates credentials
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Tokens Response */}
        <div className="flex items-center gap-8 mb-6">
          <div className="flex-1">
            <div className="bg-card border border-dashed border-border rounded-lg p-3 opacity-50">
              <div className="text-xs text-muted-foreground">
                Store tokens securely
              </div>
            </div>
          </div>
          <div className="w-32 flex items-center justify-center">
            <svg
              className="h-4 w-full text-green-600"
              viewBox="0 0 100 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="100" y1="8" x2="10" y2="8" />
              <polyline points="16,2 10,8 16,14" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="text-xs font-medium text-green-700 mb-1">
                2. Token Response
              </div>
              <div className="font-mono text-xs space-y-1">
                <div className="bg-white/80 p-1.5 rounded text-green-800">
                  accessToken (1h)
                </div>
                <div className="bg-white/80 p-1.5 rounded text-green-800">
                  refreshToken (30d)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: API Request */}
        <div className="flex items-center gap-8 mb-6">
          <div className="flex-1">
            <div className="bg-card border border-border rounded-lg p-3">
              <div className="text-xs font-medium text-primary mb-1">
                3. API Request
              </div>
              <div className="font-mono text-xs bg-muted p-2 rounded space-y-1">
                <div>Authorization: Bearer ...</div>
                <div>Key: org-123</div>
              </div>
            </div>
          </div>
          <div className="w-32 flex items-center justify-center">
            <svg
              className="h-4 w-full text-primary"
              viewBox="0 0 100 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="0" y1="8" x2="90" y2="8" />
              <polyline points="84,2 90,8 84,14" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="text-xs font-medium text-purple-700">
                Returns requested data
              </div>
            </div>
          </div>
        </div>

        {/* Step 4: Refresh (when expired) */}
        <div className="flex items-center gap-8 border-t border-border pt-6 mt-2">
          <div className="flex-1">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="text-xs font-medium text-amber-700 mb-1">
                4. When Token Expires (~1h)
              </div>
              <div className="font-mono text-xs bg-white/80 p-2 rounded text-amber-800">
                authRefreshToken(refreshToken)
              </div>
            </div>
          </div>
          <div className="w-32 flex items-center justify-center">
            <svg
              className="h-4 w-full text-amber-500"
              viewBox="0 0 100 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="4,4"
            >
              <line x1="0" y1="8" x2="90" y2="8" />
              <polyline points="84,2 90,8 84,14" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="text-xs text-amber-700">
                Issues new accessToken
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
