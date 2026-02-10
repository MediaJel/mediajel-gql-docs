# MediaJel API Documentation Portal

Interactive GraphQL API documentation with playground and AI assistant.

## Features

- **Interactive Schema Explorer** - Browse all queries, mutations, and types
- **GraphiQL Playground** - Test queries with full autocompletion
- **AI Query Assistant** - Natural language to GraphQL query generation (drawer UI)
- **Comprehensive Guides** - Quickstart, authentication, rate limits, pagination, error handling
- **Build-time Schema Sync** - Automatically pulls curated public schema from GQL service

---

## Quick Start (TL;DR)

```bash
# 1. Clone repos (must be siblings)
git clone git@github.com:MediaJel/mediajel-gql-service.git
git clone git@github.com:MediaJel/mediajel-gql-docs.git

# 2. Generate public schema in gql-service
cd mediajel-gql-service
npm install
npm run generate-public-api

# 3. Setup docs app
cd ../mediajel-gql-docs
yarn install
cp .env.example .env.local
# Edit .env.local with your values

# 4. Run docs app
yarn dev
```

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18+ | For mediajel-gql-docs |
| Node.js | 14.18.0 | For mediajel-gql-service (use nvm) |
| Yarn | 1.x | Package manager for docs app |
| npm | 6+ | For gql-service |
| OpenAI API Key | - | Required for AI assistant feature |

---

## Workspace Setup

### Directory Structure

Both repositories must be **sibling directories** in the same workspace:

```
mediajel-workspace/
├── mediajel-gql-service/     # GraphQL API backend (source of truth)
│   └── src/webapp/public-api/
│       ├── public-schema.graphql      # Auto-generated
│       ├── public-api-config.json     # Auto-generated
│       └── scripts/
│           ├── generate-public-schema.ts
│           ├── generate-public-config.ts
│           ├── generate-org-scope-config.ts
│           └── run-generation.ts
│
└── mediajel-gql-docs/        # Documentation portal (this repo)
    └── src/content/
        ├── public-schema.graphql      # Synced from gql-service
        └── public-api-config.json     # Synced from gql-service
```

### Clone Repositories

```bash
# Create workspace directory
mkdir mediajel-workspace && cd mediajel-workspace

# Clone both repos
git clone git@github.com:MediaJel/mediajel-gql-service.git
git clone git@github.com:MediaJel/mediajel-gql-docs.git
```

---

## Generating Public Schema (mediajel-gql-service)

The public schema is the **source of truth** for the documentation portal. It is auto-generated from the main GraphQL schema.

### Step 1: Setup mediajel-gql-service

```bash
cd mediajel-gql-service

# Use Node 14 (required for Prisma v1)
nvm use 14

# Install dependencies
npm install
```

### Step 2: Generate Public API Files

```bash
npm run generate-public-api
```

This runs three scripts in sequence:

| Step | Script | Output |
|------|--------|--------|
| 1 | `generate-public-schema.ts` | `public-schema.graphql` - All queries and types |
| 2 | `generate-public-config.ts` | `public-api-config.json` - Metadata and examples |
| 3 | `generate-org-scope-config.ts` | `org-scope-config.ts` - Org-level filtering rules |

### Generated Files Location

```
mediajel-gql-service/src/webapp/public-api/
├── public-schema.graphql      # ~15,000 lines, all public queries/types
├── public-api-config.json     # Category mappings, descriptions, examples
└── scripts/
    └── ...
```

### When to Regenerate

Run `npm run generate-public-api` when:
- Adding new queries/mutations to the schema
- Modifying existing query signatures
- Changing type definitions
- After Prisma schema changes

---

## Setting Up mediajel-gql-docs

### Step 1: Install Dependencies

```bash
cd mediajel-gql-docs

# Use Node 18+
nvm use 18

# Install with yarn
yarn install
```

### Step 2: Configure Environment

```bash
# Copy template
cp .env.example .env.local
```

Edit `.env.local`:

```env
# GraphQL API endpoint
# Development: http://localhost:4000
# Dojo (staging): https://api-dojo.mediajel.io
# Production: https://api.mediajel.com
NEXT_PUBLIC_GQL_ENDPOINT=http://localhost:4000

# OpenAI API key (required for AI assistant)
OPENAI_API_KEY=sk-your-api-key-here
```

### Step 3: Sync Schema

```bash
# Pull schema from gql-service into docs app
yarn sync-schema
```

This copies:
- `public-schema.graphql` → `src/content/public-schema.graphql`
- `public-api-config.json` → `src/content/public-api-config.json`

---

## Environment Variables

| Variable | Required | Description | Example Values |
|----------|----------|-------------|----------------|
| `NEXT_PUBLIC_GQL_ENDPOINT` | Yes | GraphQL API URL | `http://localhost:4000`, `https://api.mediajel.com` |
| `OPENAI_API_KEY` | Yes | OpenAI API key for AI assistant | `sk-...` |

### Environment-Specific Endpoints

| Environment | GraphQL Endpoint |
|-------------|------------------|
| Local Development | `http://localhost:4000` |
| Dojo (Staging) | `https://api-dojo.mediajel.io` |
| Production | `https://api.mediajel.com` |

---

## Development

### Standard Mode

```bash
yarn dev
```

- Runs Next.js dev server on port **3006**
- Access at `http://localhost:3006`

### Watch Mode (Recommended for Development)

```bash
yarn start:watch
```

This runs concurrently:
- Next.js dev server on port 3006
- File watcher that auto-syncs schema when files change in `mediajel-gql-service/src/webapp/public-api/`

### Manual Schema Sync

```bash
yarn sync-schema
```

---

## Production Build

```bash
# Build (syncs schema + builds Next.js app)
yarn build

# Start production server
yarn start
```

---

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
├── public/                    # Static assets
├── .env.example               # Environment template
├── .env.local                 # Local environment (git-ignored)
├── package.json
└── README.md
```

---

## Scripts Reference

| Script | Description |
|--------|-------------|
| `yarn dev` | Start dev server on port 3006 |
| `yarn start:watch` | Dev server + auto-sync schema on changes |
| `yarn build` | Sync schema + build production bundle |
| `yarn start` | Start production server |
| `yarn sync-schema` | Manually sync schema from GQL service |
| `yarn lint` | Run ESLint |

---

## Schema Management

### How Schema Sync Works

1. **Source**: `mediajel-gql-service/src/webapp/public-api/`
2. **Destination**: `mediajel-gql-docs/src/content/`
3. **Script**: `scripts/sync-schema.js`

The sync copies two files:
- `public-schema.graphql` - GraphQL SDL with all public operations
- `public-api-config.json` - Metadata (descriptions, examples, categories)

### Complete Schema Update Workflow

```bash
# 1. In mediajel-gql-service: regenerate public schema
cd mediajel-gql-service
nvm use 14
npm run generate-public-api

# 2. In mediajel-gql-docs: sync and restart
cd ../mediajel-gql-docs
nvm use 18
yarn sync-schema
yarn dev
```

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 14 | App Router, React framework |
| Tailwind CSS | Styling |
| shadcn/ui | UI components |
| GraphiQL v3 | Interactive playground |
| Vercel AI SDK | AI chat integration |
| OpenAI GPT-4 | AI assistant |
| graphql | Schema parsing |
| react-markdown | Markdown rendering |
| prism-react-renderer | Code syntax highlighting |

---

## Knowledge Base Integration

The AI assistant is powered by a Knowledge Base synced from Notion to OpenAI. Content is scraped from mediajel.com and organized in Notion for easy editing.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        KNOWLEDGE BASE ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐       ┌──────────────┐       ┌──────────────────────────┐
  │              │       │              │       │                          │
  │ mediajel.com │──────▶│    Notion    │──────▶│   OpenAI Vector Store    │
  │   (Source)   │ scrape│ Knowledge Base│ sync  │   (File Search Index)    │
  │              │       │              │       │                          │
  └──────────────┘       └──────────────┘       └────────────┬─────────────┘
                                                             │
                               ┌─────────────────────────────┘
                               │
                               ▼
                   ┌───────────────────────┐
                   │                       │
                   │   OpenAI Assistant    │
                   │   (GPT-4 + RAG)       │
                   │                       │
                   └───────────┬───────────┘
                               │
                               ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │                                                                        │
  │                     mediajel-gql-docs (Next.js)                        │
  │  ┌──────────────────────────────────────────────────────────────────┐  │
  │  │                        /api/chat                                 │  │
  │  │                   (Chat API Route)                               │  │
  │  └──────────────────────────┬───────────────────────────────────────┘  │
  │                             │                                          │
  │                             ▼                                          │
  │  ┌──────────────────────────────────────────────────────────────────┐  │
  │  │                    AI Query Assistant                            │  │
  │  │              (Drawer UI + Full Page Chat)                        │  │
  │  └──────────────────────────────────────────────────────────────────┘  │
  │                                                                        │
  └────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Content Source**: Website content scraped from mediajel.com
2. **Notion KB**: Organized into sections (Company, Product, Technical, Operations, Sales & Marketing, Services)
3. **Sync Script**: `yarn sync:knowledge` fetches Notion pages and uploads to OpenAI
4. **Vector Store**: OpenAI indexes content for semantic search (RAG)
5. **Assistant**: GPT-4 with file_search tool queries the vector store
6. **Chat API**: Next.js API route streams responses to the UI

### Knowledge Base Sections

| Section | Content |
|---------|---------|
| Company | Mission, values, leadership team |
| Product | DemoGraph, MediaJel Buyer, DataJel, Search Lights pricing |
| Technical | Attribution methodology, advertising channels, integrations |
| Operations | Cannabis compliance playbook, FAQs |
| Sales & Marketing | Target industries, case studies, competitive analysis |
| Services | Dispensary marketing, agency services |

### Scripts

| Script | Description |
|--------|-------------|
| `yarn build:kb` | Create Knowledge Base structure in Notion with pre-filled content |
| `yarn sync:knowledge` | Sync Notion KB to OpenAI vector store and create/update assistant |

### Environment Variables (Knowledge Base)

| Variable | Required | Description |
|----------|----------|-------------|
| `NOTION_SECRET` | Yes | Notion integration API key |
| `NOTION_PARENT_PAGE_ID` | Yes | Parent page ID for creating new KB |
| `NOTION_ROOT_PAGE_ID` | Yes | Root KB page ID (after build:kb) |
| `OPENAI_ASSISTANT_ID` | Auto | Generated by sync:knowledge |
| `OPENAI_VECTOR_STORE_ID` | Auto | Generated by sync:knowledge |

### Updating the Knowledge Base

```bash
# Option 1: Edit content directly in Notion, then sync
yarn sync:knowledge

# Option 2: Rebuild entire KB from scratch
yarn build:kb
# Copy the outputted NOTION_ROOT_PAGE_ID to .env.local
yarn sync:knowledge
```

---

## Deployment

### DevOps Checklist

1. **Environment Variables**
   - Set `OPENAI_API_KEY` in deployment platform
   - Set `NEXT_PUBLIC_GQL_ENDPOINT` to appropriate environment

2. **Build Command**
   ```bash
   yarn build
   ```

3. **Start Command**
   ```bash
   yarn start
   ```

4. **Node Version**: 18+

### Deployment Platforms

- **Vercel** (recommended) - Auto-detects Next.js
- **Docker** - Use Node 18 base image
- **AWS/GCP** - Any Node.js hosting

### Docker Example

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

EXPOSE 3000
CMD ["yarn", "start"]
```

---

## Troubleshooting

### "Source file not found" during sync

```
Error: Source file not found: .../mediajel-gql-service/src/webapp/public-api/public-schema.graphql
```

**Solution**: Generate the public schema first:
```bash
cd mediajel-gql-service
npm run generate-public-api
```

### Schema not updating after changes

1. Regenerate schema in gql-service: `npm run generate-public-api`
2. Sync in docs app: `yarn sync-schema`
3. Restart dev server: `yarn dev`

### AI Assistant not working

- Verify `OPENAI_API_KEY` is set in `.env.local`
- Check API key has sufficient credits
- Check browser console for errors

### Port 3006 already in use

```bash
# Find and kill process using port 3006
lsof -i :3006
kill -9 <PID>
```

---

## License

Proprietary - MediaJel Inc.
