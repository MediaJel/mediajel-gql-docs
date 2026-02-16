#!/bin/sh
set -e

# Runtime injection of NEXT_PUBLIC_GQL_ENDPOINT
# Next.js inlines NEXT_PUBLIC_* vars at build time, so we need to replace
# the placeholder value in the built JS files at container startup.
if [ -n "$NEXT_PUBLIC_GQL_ENDPOINT" ]; then
  echo "Injecting NEXT_PUBLIC_GQL_ENDPOINT: $NEXT_PUBLIC_GQL_ENDPOINT"
  # Replace the build-time placeholder with the runtime value in all JS files
  find /rootDir/.next -type f -name "*.js" -exec sed -i "s|http://localhost:4000|$NEXT_PUBLIC_GQL_ENDPOINT|g" {} \;
  echo "Environment injection complete."
fi

echo "Syncing schema..."
yarn sync-schema

echo "Starting application..."
exec yarn start
