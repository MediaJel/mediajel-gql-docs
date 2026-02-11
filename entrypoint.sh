#!/bin/sh
set -e

echo "Syncing schema..."
yarn sync-schema

echo "Starting application..."
exec yarn start
