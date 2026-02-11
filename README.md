# MediaJel API Documentation Portal

Interactive GraphQL API documentation with playground and AI assistant.

**Key Features:**
- Interactive Schema Explorer - Browse all queries, mutations, and types
- GraphiQL Playground - Test queries with full autocompletion
- AI Query Assistant - Natural language to GraphQL query generation (powered by Knowledge Base)
- Comprehensive Guides - Quickstart, authentication, rate limits, pagination, error handling

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MEDIAJEL DOCS ARCHITECTURE                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│ mediajel-gql-service│     │   knowledge-sync    │     │     Notion KB       │
│                     │     │                     │     │                     │
│  schema.graphql     │     │  Fetches pages      │◄────│  Company, Product,  │
│  prisma.graphql     │     │  Extracts content   │     │  Technical, Ops...  │
│         │           │     │  Uploads to OpenAI  │     │                     │
│         ▼           │     │         │           │     └─────────────────────┘
│  generate-public-api│     │         ▼           │
│         │           │     │  OpenAI Vector Store│
│         ▼           │     │  OpenAI Assistant   │
│  public-schema.graphql    │         │           │
│  public-api-config.json   └─────────┼───────────┘
│         │           │               │
└─────────┼───────────┘               │
          │                           │
          ▼                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        mediajel-gql-docs (Next.js)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  src/content/                    │  src/app/api/chat/                       │
│  ├── public-schema.graphql       │  └── Queries OpenAI Assistant            │
│  └── public-api-config.json      │      with file_search (RAG)              │
├─────────────────────────────────────────────────────────────────────────────┤
│  Schema Explorer │ GraphiQL Playground │ AI Assistant │ Guides              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

The system has **two parallel pipelines** that feed into the docs app:

### Pipeline 1: Schema (GraphQL Operations)

```
mediajel-gql-service          mediajel-gql-docs
       │                             │
       ▼                             │
  generate-public-api                │
       │                             │
       ▼                             ▼
  public-schema.graphql  ──────►  src/content/public-schema.graphql
  public-api-config.json ──────►  src/content/public-api-config.json
                         (yarn sync-schema)
```

**Purpose**: Powers Schema Explorer, GraphiQL Playground, and query autocompletion.

### Pipeline 2: Knowledge Base (AI Assistant)

```
Notion KB  ──────►  knowledge-sync  ──────►  OpenAI Vector Store
                                                    │
                                                    ▼
                                            OpenAI Assistant (GPT-4 + RAG)
                                                    │
                                                    ▼
                                            /api/chat route
                                                    │
                                                    ▼
                                            AI Query Assistant UI
```

**Purpose**: Powers the AI assistant with company/product knowledge for contextual responses.

---

## Authentication Flow

The GraphQL API uses AWS Cognito for authentication. Here's the flow:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AUTHENTICATION FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

  1. User calls authSignIn mutation with username/password
                              │
                              ▼
  2. gql-service authenticates with AWS Cognito
                              │
                              ▼
  3. Returns: accessToken, idToken, refreshToken
                              │
                              ▼
  4. All subsequent requests use:
     • Header: Authorization: Bearer <accessToken>
     • Header: Key: <organizationId>
```

### Example Sign In

```graphql
mutation {
  authSignIn(input: {
    username: "user@example.com"
    password: "yourPassword"
  }) {
    accessToken
    idToken
    refreshToken
  }
}
```

### Authenticated Request Headers

| Header | Value | Description |
|--------|-------|-------------|
| `Authorization` | `Bearer <accessToken>` | JWT token from sign in |
| `Key` | `<organizationId>` | Organization context for queries |

---

## Embeddable Playground

The GraphiQL playground can be embedded in other applications (e.g., mediajel-dashboard) via iframe with automatic authentication.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EMBEDDABLE USAGE FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│     mediajel-dashboard (localhost:3000)     │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │       ApiDocsView Component           │  │
│  │                                       │  │
│  │  • Fetch JWT from Auth.currentSession │  │
│  │  • Build iframe URL with params       │  │
│  │  • Render iframe                      │  │
│  └───────────────────────────────────────┘  │
│                     │                       │
└─────────────────────┼───────────────────────┘
                      │
                      ▼
       ┌──────────────────────────────┐
       │     iframe (full viewport)   │
       │                              │
       │  src: http://localhost:3006  │
       │       /playground?           │
       │       embedded=true&         │
       │       token=JWT&             │
       │       orgId=ORG_ID           │
       └──────────────┬───────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    mediajel-gql-docs (localhost:3006)                       │
│                                                                             │
│  1. Middleware detects ?embedded=true                                       │
│     → Sets mediajel_embedded=true cookie                                    │
│                                                                             │
│  2. EmbedAuthBridge reads URL params                                        │
│     → Injects token + orgId into localStorage                               │
│                                                                             │
│  3. Playground auto-authenticates                                           │
│     → Reads from localStorage                                               │
│     → No login form shown                                                   │
│                                                                             │
│  4. Full UI rendered (header, sidebar, etc.)                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Embed URL Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `embedded` | Yes | Set to `true` to enable embedded mode |
| `token` | Yes | JWT access token from parent app |
| `orgId` | Yes | Organization ID for API context |

### Example iframe Implementation

```html
<iframe
  src="http://localhost:3006/playground?embedded=true&token=JWT_TOKEN&orgId=ORG_ID"
  style="width: 100%; height: 100vh; border: none;"
  title="API Playground"
/>
```

### React Component Example

```tsx
const ApiDocsView = () => {
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  useEffect(() => {
    const buildUrl = async () => {
      const session = await Auth.currentSession();
      const token = session.getAccessToken().getJwtToken();
      const orgId = getCurrentOrgId();

      const url = new URL('http://localhost:3006/playground');
      url.searchParams.set('embedded', 'true');
      url.searchParams.set('token', token);
      url.searchParams.set('orgId', orgId);

      setIframeUrl(url.toString());
    };
    buildUrl();
  }, []);

  if (!iframeUrl) return <Loading />;

  return (
    <iframe
      src={iframeUrl}
      style={{ width: '100%', height: '100vh', border: 'none' }}
      title="API Playground"
    />
  );
};
```

---

## DevOps Quick Start

Follow these phases in order. Each phase must complete before the next begins.

### PHASE 1: Generate Schema (mediajel-gql-service)

**Time**: ~2 minutes | **Prerequisite**: Node 14

```bash
cd mediajel-gql-service
nvm use 14
yarn install
yarn generate-public-api
```

**Output files** (in `src/webapp/public-api/`):
- `public-schema.graphql` - All public queries/mutations/types (~15,000 lines)
- `public-api-config.json` - Category mappings, descriptions, examples

### PHASE 2: Sync Knowledge Base (Optional)

**Time**: ~5 minutes | **Prerequisite**: Notion & OpenAI API keys

Skip this phase if you only need Schema Explorer and Playground without AI features.

```bash
cd knowledge-sync
yarn install
cp .env.example .env
# Edit .env with:
#   NOTION_SECRET=<your-notion-integration-key>
#   NOTION_ROOT_PAGE_ID=<your-kb-root-page-id>
#   OPENAI_API_KEY=<your-openai-key>
yarn sync
```

**Output** (save these for Phase 3):
- `OPENAI_ASSISTANT_ID` - Printed to console
- `OPENAI_VECTOR_STORE_ID` - Printed to console

### PHASE 3: Setup Docs App (mediajel-gql-docs)

**Time**: ~2 minutes | **Prerequisite**: Node 18, Phases 1 & 2 complete

```bash
cd mediajel-gql-docs
nvm use 18
yarn install
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Required
NEXT_PUBLIC_GQL_ENDPOINT=http://localhost:4000
OPENAI_API_KEY=sk-your-api-key

# From Phase 2 (required for AI assistant)
OPENAI_ASSISTANT_ID=asst_xxxxx
OPENAI_VECTOR_STORE_ID=vs_xxxxx

# Optional - for KB sync scripts
NOTION_SECRET=secret_xxxxx
NOTION_ROOT_PAGE_ID=xxxxx
```

Sync the schema from Phase 1:

```bash
yarn sync-schema
```

### PHASE 4: Run Application

```bash
yarn dev
```

**Access at**: http://localhost:3006

---

## Prerequisites

| Requirement | Version | Used For |
|-------------|---------|----------|
| Node.js | 14.18.0 | mediajel-gql-service (use `nvm use 14`) |
| Node.js | 18+ | mediajel-gql-docs (use `nvm use 18`) |
| Yarn | 1.x | Package manager for all projects |
| OpenAI API Key | - | AI assistant feature |
| Notion API Key | - | Knowledge Base sync (optional) |

---

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_GQL_ENDPOINT` | Yes | GraphQL API URL for playground | `http://localhost:4000` |
| `OPENAI_API_KEY` | Yes | OpenAI API key for AI assistant | `sk-...` |
| `OPENAI_ASSISTANT_ID` | For AI | Assistant ID from knowledge-sync | `asst_...` |
| `OPENAI_VECTOR_STORE_ID` | For AI | Vector store ID from knowledge-sync | `vs_...` |
| `NOTION_SECRET` | For KB sync | Notion integration API key | `secret_...` |
| `NOTION_ROOT_PAGE_ID` | For KB sync | Root KB page ID in Notion | Page ID |
| `NOTION_PARENT_PAGE_ID` | For KB build | Parent page for new KB creation | Page ID |

### GraphQL Endpoints by Environment

| Environment | Endpoint |
|-------------|----------|
| Local Development | `http://localhost:4000` |
| Dojo (Staging) | `https://api-dojo.mediajel.io` |
| Production | `https://api.mediajel.com` |

---

## Knowledge Base Integration

The AI assistant uses a Knowledge Base synced from Notion to OpenAI for contextual, accurate responses.

### How It Works

```
┌──────────────┐       ┌──────────────┐       ┌──────────────────────────┐
│              │       │              │       │                          │
│ mediajel.com │──────▶│    Notion    │──────▶│   OpenAI Vector Store    │
│   (Source)   │ scrape│ Knowledge Base│ sync  │   (File Search Index)    │
│              │       │              │       │                          │
└──────────────┘       └──────────────┘       └────────────┬─────────────┘
                                                           │
                                                           ▼
                                               ┌───────────────────────┐
                                               │   OpenAI Assistant    │
                                               │   (GPT-4 + RAG)       │
                                               └───────────┬───────────┘
                                                           │
                                                           ▼
                                               ┌───────────────────────┐
                                               │  /api/chat Route      │
                                               │  (mediajel-gql-docs)  │
                                               └───────────────────────┘
```

### Knowledge Base Sections

| Section | Content |
|---------|---------|
| Company | Mission, values, leadership team |
| Product | DemoGraph, MediaJel Buyer, DataJel, Search Lights pricing |
| Technical | Attribution methodology, advertising channels, integrations |
| Operations | Cannabis compliance playbook, FAQs |
| Sales & Marketing | Target industries, case studies, competitive analysis |
| Services | Dispensary marketing, agency services |

### Updating the Knowledge Base

```bash
# Option 1: Edit content in Notion, then sync
yarn sync:knowledge

# Option 2: Rebuild entire KB from scratch
yarn build:kb
# Copy the outputted NOTION_ROOT_PAGE_ID to .env.local
yarn sync:knowledge
```

---

## Development Commands

| Command | Description |
|---------|-------------|
| `yarn dev` | Start dev server on port 3006 |
| `yarn start:watch` | Dev server + auto-sync schema on file changes |
| `yarn build` | Sync schema + build production bundle |
| `yarn start` | Start production server |
| `yarn sync-schema` | Manually sync schema from GQL service |
| `yarn sync:knowledge` | Sync Notion KB to OpenAI |
| `yarn build:kb` | Create KB structure in Notion |
| `yarn lint` | Run ESLint |

---

## Directory Structure

```
mediajel-workspace/
├── mediajel-gql-service/           # GraphQL API backend (source of truth)
│   └── src/webapp/public-api/
│       ├── public-schema.graphql   # Auto-generated
│       └── public-api-config.json  # Auto-generated
│
├── knowledge-sync/                  # Notion → OpenAI sync scripts
│   ├── .env                         # API keys
│   └── scripts/
│
└── mediajel-gql-docs/               # This repo - Documentation portal
    ├── src/
    │   ├── app/                     # Next.js App Router pages
    │   │   ├── schema/              # Schema explorer
    │   │   ├── playground/          # GraphiQL playground
    │   │   ├── assistant/           # AI chat (full page)
    │   │   ├── guides/              # Static documentation
    │   │   └── api/chat/            # AI chat API route
    │   ├── components/              # React components
    │   ├── lib/                     # Utilities
    │   └── content/                 # Synced schema files
    │       ├── public-schema.graphql
    │       └── public-api-config.json
    ├── scripts/
    │   └── sync-schema.js
    └── .env.local                   # Environment config
```

---

## Troubleshooting

### "Source file not found" during sync

```
Error: Source file not found: .../mediajel-gql-service/src/webapp/public-api/public-schema.graphql
```

**Cause**: Phase 1 not completed - schema not generated yet.

**Solution**:
```bash
cd mediajel-gql-service
nvm use 14
yarn generate-public-api
```

### Schema not updating after changes

**Solution**: Run the complete update workflow:
```bash
# 1. Regenerate in gql-service
cd mediajel-gql-service && yarn generate-public-api

# 2. Sync in docs app
cd ../mediajel-gql-docs && yarn sync-schema

# 3. Restart dev server
yarn dev
```

### AI Assistant not working

**Check**:
1. `OPENAI_API_KEY` is set in `.env.local`
2. `OPENAI_ASSISTANT_ID` is set (from Phase 2)
3. `OPENAI_VECTOR_STORE_ID` is set (from Phase 2)
4. API key has sufficient credits
5. Browser console for specific errors

### Port 3006 already in use

```bash
lsof -i :3006
kill -9 <PID>
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

---

## Deployment

### Environment Variables Required

- `OPENAI_API_KEY` - Required
- `OPENAI_ASSISTANT_ID` - Required for AI features
- `OPENAI_VECTOR_STORE_ID` - Required for AI features
- `NEXT_PUBLIC_GQL_ENDPOINT` - Set to appropriate environment

### Commands

```bash
# Build
yarn build

# Start
yarn start
```

**Node Version**: 18+

### Platforms

- **Vercel** (recommended) - Auto-detects Next.js
- **Docker** - Use Node 18 base image
- **AWS/GCP** - Any Node.js hosting

---

## License

Proprietary - MediaJel Inc.
