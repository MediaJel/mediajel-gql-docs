# MediaJel API Documentation Portal

Interactive GraphQL API documentation with playground and AI assistant.

## Features

- **Interactive Schema Explorer** - Browse all queries, mutations, and types
- **GraphiQL Playground** - Test queries with full autocompletion
- **AI Query Assistant** - Natural language to GraphQL query generation (drawer UI)
- **Comprehensive Guides** - Quickstart, authentication, rate limits, pagination, error handling
- **Build-time Schema Sync** - Automatically pulls curated public schema from GQL service

## Prerequisites

- Node.js 18+
- `mediajel-gql-service` must exist at `../mediajel-gql-service` (sibling directory)
- OpenAI API key for AI assistant

## Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Add your OpenAI API key to .env.local
# OPENAI_API_KEY=sk-...
# NEXT_PUBLIC_GQL_ENDPOINT=http://localhost:4000
```

## Development

### Standard Mode
Runs the Next.js dev server only:
```bash
npm run dev
```
Docs will be available at `http://localhost:3006`

### Watch Mode (Recommended)
Runs dev server + watches for schema changes in the GQL service:
```bash
npm run dev:watch
```

This runs:
- Next.js dev server on port 3006
- File watcher that auto-syncs `public-schema.graphql` and `public-api-config.json` when they change

### Manual Schema Sync
If you need to manually sync the schema from the GQL service:
```bash
npm run sync-schema
```

## Production Build

```bash
# Build (syncs schema + builds Next.js app)
npm run build

# Start production server
npm start
```

## Project Structure

```
mediajel-gql-docs/
├── src/
│   ├── app/                    # Next.js 14 App Router pages
│   │   ├── page.tsx           # Homepage
│   │   ├── schema/            # Schema explorer
│   │   ├── playground/        # GraphiQL playground
│   │   ├── assistant/         # AI chat (full page)
│   │   ├── guides/            # Static documentation
│   │   └── api/chat/          # AI chat API route
│   ├── components/
│   │   ├── assistant/         # Chat UI + drawer
│   │   ├── layout/            # Header, sidebar, app shell
│   │   ├── playground/        # GraphiQL wrapper + auth
│   │   ├── schema/            # Operation detail views
│   │   └── ui/                # Shared UI components
│   ├── lib/
│   │   ├── schema.ts          # Schema parsing utilities
│   │   └── utils.ts           # General utilities
│   └── content/               # Schema files (synced from GQL service)
│       ├── public-schema.graphql
│       └── public-api-config.json
├── scripts/
│   └── sync-schema.js         # Schema sync script
└── public/                    # Static assets
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for AI assistant |
| `NEXT_PUBLIC_GQL_ENDPOINT` | Yes | GraphQL API endpoint (e.g., `http://localhost:4000`) |

## Schema Management

The docs app reads from a **curated public schema** maintained in `mediajel-gql-service/src/webapp/public-api/`:

- `public-schema.graphql` - SDL with only public operations (no sensitive fields)
- `public-api-config.json` - Per-operation metadata (descriptions, examples, categories)

The sync script copies these files to `src/content/` at build time.

### Adding New Operations

1. Edit `mediajel-gql-service/src/webapp/public-api/public-schema.graphql`
2. Add metadata to `public-api-config.json`
3. Run `npm run sync-schema` in the docs app (or use `dev:watch`)
4. Restart the dev server

## Tech Stack

- **Next.js 14** (App Router)
- **Tailwind CSS** + shadcn/ui components
- **GraphiQL v3** - Interactive playground
- **Vercel AI SDK** + OpenAI GPT-4o - AI assistant
- **graphql** npm package - Schema parsing
- **react-markdown** + prism-react-renderer - Code rendering

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server on port 3006 |
| `npm run dev:watch` | Dev server + auto-sync schema on changes |
| `npm run build` | Sync schema + build production bundle |
| `npm start` | Start production server |
| `npm run sync-schema` | Manually sync schema from GQL service |
| `npm run lint` | Run ESLint |

## Deployment

The docs app is a standalone Next.js application and can be deployed to:

- Vercel (recommended)
- Any Node.js hosting platform
- Docker container

Make sure to:
1. Set `OPENAI_API_KEY` and `NEXT_PUBLIC_GQL_ENDPOINT` environment variables
2. Ensure the GQL service endpoint is accessible from the deployed environment
3. Run `npm run build` during the build step

## License

Proprietary - MediaJel Inc.
