# MediaJel API Documentation Portal

Interactive GraphQL API documentation with playground and AI assistant.

## Features

- **Interactive Schema Explorer** - Browse all queries, mutations, and types
- **GraphiQL Playground** - Test queries with full autocompletion
- **AI Query Assistant** - Natural language to GraphQL query generation (drawer UI)
- **Comprehensive Guides** - Quickstart, authentication, rate limits, pagination, error handling
- **Build-time Schema Sync** - Automatically pulls curated public schema from S3 (or local fallback)

---

## Quick Start (TL;DR)

### Option A: Using S3 (Recommended)

```bash
# 1. Clone docs repo
git clone git@github.com:MediaJel/mediajel-gql-docs.git
cd mediajel-gql-docs

# 2. Install and configure
yarn install
cp .env.example .env.local
# Edit .env.local - add OPENAI_API_KEY and S3 config

# 3. Sync schema from S3 and run
yarn sync-schema   # Downloads from S3
yarn dev
```

### Option B: Local Development (Both Repos)

```bash
# 1. Clone repos (must be siblings)
git clone git@github.com:MediaJel/mediajel-gql-service.git
git clone git@github.com:MediaJel/mediajel-gql-docs.git

# 2. Generate public schema in gql-service
cd mediajel-gql-service
npm install
yarn generate-public-api   # Generates + uploads to S3

# 3. Setup docs app
cd ../mediajel-gql-docs
yarn install
cp .env.example .env.local
# Edit .env.local with your values

# 4. Run docs app (uses S3 by default, or set SCHEMA_SOURCE=local)
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

### Architecture Overview

```
┌─────────────────────────┐         ┌─────────────────────┐         ┌─────────────────────┐
│  mediajel-gql-service   │         │        S3           │         │  mediajel-gql-docs  │
│  (Source of Truth)      │────────▶│   mj-creatives/     │────────▶│  (Documentation)    │
│                         │ upload  │   public-api-schema │  sync   │                     │
└─────────────────────────┘         └─────────────────────┘         └─────────────────────┘
```

- **mediajel-gql-service** generates the public schema and uploads to S3
- **S3** acts as the central storage for schema files
- **mediajel-gql-docs** syncs from S3 at build time

### Directory Structure

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
│           ├── run-generation.ts
│           └── upload-to-s3.ts        # Uploads to S3
│
└── mediajel-gql-docs/        # Documentation portal (this repo)
    └── src/content/
        ├── public-schema.graphql      # Synced from S3
        └── public-api-config.json     # Synced from S3
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
nvm use 18

# Install dependencies
npm install
```

### Step 2: Generate Public API Files

```bash
# For dojo environment (default)
yarn generate-public-api

# For staging environment
yarn generate-public-api:staging

# For production environment
yarn generate-public-api:production
```

This runs four steps in sequence:

| Step | Script | Output |
|------|--------|--------|
| 1 | `generate-public-schema.ts` | `public-schema.graphql` - All queries and types |
| 2 | `generate-public-config.ts` | `public-api-config.json` - Metadata and examples |
| 3 | `generate-org-scope-config.ts` | `org-scope-config.ts` - Org-level filtering rules |
| 4 | `upload-to-s3.ts` | Uploads files to S3 bucket |

### S3 Upload

The generation script automatically uploads files to S3 when environment variables are configured:

- **Bucket**: `mj-creatives`
- **Path**: `s3://mj-creatives/public-api-schema/`
- **Files**: `public-schema.graphql`, `public-api-config.json`

Environment variables required (loaded from `webapp_environment_files/.dojo.env`):
- `CREATIVE_BUCKET_NAME` - S3 bucket name
- `PUBLIC_API_SCHEMA_NAME` - Directory name in S3
- `CAMPAIGN_REPORT_BUCKET_REGION` - AWS region

### Generated Files Location

```
mediajel-gql-service/src/webapp/public-api/
├── public-schema.graphql      # ~15,000 lines, all public queries/types
├── public-api-config.json     # Category mappings, descriptions, examples
└── scripts/
    └── ...
```

### When to Regenerate

Run `yarn generate-public-api` when:
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
# Pull schema from S3 (default)
yarn sync-schema

# Or pull from local gql-service (development)
SCHEMA_SOURCE=local yarn sync-schema
```

This downloads/copies:
- `public-schema.graphql` → `src/content/public-schema.graphql`
- `public-api-config.json` → `src/content/public-api-config.json`

---

## Environment Variables

### Documentation App Variables

| Variable | Required | Description | Example Values |
|----------|----------|-------------|----------------|
| `NEXT_PUBLIC_GQL_ENDPOINT` | Yes | GraphQL API URL | `http://localhost:4000`, `https://api.mediajel.com` |
| `OPENAI_API_KEY` | Yes | OpenAI API key for AI assistant | `sk-...` |
| `SCHEMA_SOURCE` | No | Schema source: `s3` (default) or `local` | `s3`, `local` |
| `CREATIVE_BUCKET_NAME` | For S3 | S3 bucket name | `mj-creatives` |
| `CREATIVE_BUCKET_REGION` | For S3 | AWS region | `us-west-2` |
| `PUBLIC_API_SCHEMA_NAME` | For S3 | S3 directory name | `public-api-schema` |

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
| `yarn sync-schema` | Sync schema from S3 (or local with `SCHEMA_SOURCE=local`) |
| `yarn lint` | Run ESLint |

---

## Schema Management

### How Schema Sync Works

The sync script (`scripts/sync-schema.js`) supports two modes:

#### S3 Mode (Default - Production/CI)

```
S3 Bucket (mj-creatives)          →    mediajel-gql-docs/src/content/
└── public-api-schema/
    ├── public-schema.graphql     →    public-schema.graphql
    └── public-api-config.json    →    public-api-config.json
```

Required environment variables:
- `CREATIVE_BUCKET_NAME` - S3 bucket (e.g., `mj-creatives`)
- `CREATIVE_BUCKET_REGION` - AWS region (e.g., `us-west-2`)
- `PUBLIC_API_SCHEMA_NAME` - Directory in S3 (default: `public-api-schema`)

#### Local Mode (Development)

```
mediajel-gql-service/src/webapp/public-api/    →    mediajel-gql-docs/src/content/
├── public-schema.graphql                      →    public-schema.graphql
└── public-api-config.json                     →    public-api-config.json
```

Set `SCHEMA_SOURCE=local` to use local filesystem (requires sibling repos).

### Complete Schema Update Workflow

```bash
# 1. In mediajel-gql-service: regenerate and upload to S3
cd mediajel-gql-service
nvm use 18
yarn generate-public-api   # Generates files + uploads to S3

# 2. In mediajel-gql-docs: sync from S3 and restart
cd ../mediajel-gql-docs
nvm use 18
yarn sync-schema              # Downloads from S3
yarn dev
```

### Local Development (Without S3)

```bash
# Set local mode
export SCHEMA_SOURCE=local

# Sync from local filesystem
yarn sync-schema
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

## Deployment

### DevOps Checklist

1. **Environment Variables**

   | Variable | Required | Description |
   |----------|----------|-------------|
   | `OPENAI_API_KEY` | Yes | OpenAI API key for AI assistant |
   | `NEXT_PUBLIC_GQL_ENDPOINT` | Yes | GraphQL API endpoint for the target environment |
   | `CREATIVE_BUCKET_NAME` | Yes | S3 bucket name (e.g., `mj-creatives`) |
   | `CREATIVE_BUCKET_REGION` | Yes | AWS region (e.g., `us-west-2`) |
   | `PUBLIC_API_SCHEMA_NAME` | No | S3 directory (default: `public-api-schema`) |

2. **AWS Permissions**

   The build process requires S3 read access:
   ```json
   {
     "Effect": "Allow",
     "Action": ["s3:GetObject"],
     "Resource": "arn:aws:s3:::mj-creatives/public-api-schema/*"
   }
   ```

3. **Build Command**
   ```bash
   yarn build
   ```
   This automatically syncs schema from S3 before building.

4. **Start Command**
   ```bash
   yarn start
   ```

5. **Node Version**: 18+

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

### S3 sync fails with "Access Denied"

**Solution**: Ensure AWS credentials are configured with S3 read access:
```bash
# Check AWS credentials
aws sts get-caller-identity

# Test S3 access
aws s3 ls s3://mj-creatives/public-api-schema/
```

### S3 sync fails with "bucket not configured"

**Solution**: Set required environment variables:
```bash
export CREATIVE_BUCKET_NAME=mj-creatives
export CREATIVE_BUCKET_REGION=us-west-2
export PUBLIC_API_SCHEMA_NAME=public-api-schema
```

### "Source file not found" during local sync

```
Error: Source file not found: .../mediajel-gql-service/src/webapp/public-api/public-schema.graphql
```

**Solution**: Either generate the public schema or use S3 mode:
```bash
# Option 1: Generate schema locally
cd mediajel-gql-service
yarn generate-public-api

# Option 2: Use S3 mode (default)
unset SCHEMA_SOURCE  # or remove SCHEMA_SOURCE=local
yarn sync-schema
```

### Schema not updating after changes

1. Regenerate and upload in gql-service: `yarn generate-public-api`
2. Sync from S3 in docs app: `yarn sync-schema`
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
