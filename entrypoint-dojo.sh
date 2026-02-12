#!/bin/sh
set -e

echo "Syncing schema..."
yarn sync-schema:dojo

echo "Starting application..."
exec yarn start
