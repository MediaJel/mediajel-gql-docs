#!/bin/sh
set -e

echo "Syncing schema..."
yarn sync-schema:production

echo "Starting application..."
exec yarn start
