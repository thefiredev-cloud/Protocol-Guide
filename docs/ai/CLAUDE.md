# Protocol Guide (Manus Edition)

Progressive Web App (PWA) for EMS personnel to search medical protocols using natural language. Distributed via web (Netlify) - users install directly to their phone/tablet home screen.

## Quick Navigation

For rapid context loading, see:
- **[AI-CHEATSHEET.md](./AI-CHEATSHEET.md)** - Essential commands, structure, and gotchas (read this first)
- **[agents/AGENTS.md](./agents/AGENTS.md)** - 37 specialized AI agents

## Distribution Strategy

**PWA via Netlify** (NOT App Store)
- Users visit the website and "Add to Home Screen"
- Works offline with service worker caching
- iOS-style UI using React Native Web
- No app store review process or fees

## Architecture

**Expo + React Native Web PWA**

| Layer | Actual Technology |
|-------|-------------------|
| Frontend | Expo 54, React Native Web 0.21, React 19.1 |
| Routing | Expo Router (`app/`) |
| Styling | NativeWind 4.2 (Tailwind for RN), Tailwind CSS 3.4 |
| State | TanStack Query v5 |
| Backend | tRPC 11.7, Express, Node.js |
| Database | Supabase (PostgreSQL + pgvector for protocols/embeddings) |
| AI | **Anthropic Claude SDK** (Sonnet 4.5 / Haiku 4.5), **Voyage AI** embeddings |
| Payments | Stripe |
| Auth | Supabase Auth (Google/Apple OAuth) |
| Hosting | Netlify |

## LLM Architecture

### Claude Models (Anthropic SDK)
- **Haiku 4.5** (`claude-haiku-4-5-20251001`): Free tier, simple Pro queries
- **Sonnet 4.5** (`claude-sonnet-4-5-20250929`): Complex Pro queries

### Voyage AI Embeddings
- **Model**: `voyage-large-2` (1536 dimensions)
- **Use**: Semantic search via Supabase pgvector
- **Batch Size**: 128 (Voyage max)

### Tiered LLM Routing
```
Free tier → Haiku 4.5 only (~$0.0003-0.0005/query)
Pro simple → Haiku 4.5 (~$0.0003-0.0005/query)
Pro complex → Sonnet 4.5 (~$0.002-0.004/query)
```

## Quick Reference

```bash
# Development
pnpm dev               # Start Expo web dev server
pnpm start             # Start production server

# Database
pnpm db:push           # Generate + apply migrations

# Testing
pnpm test              # Run tests

# Code Quality
pnpm check             # TypeScript type checking
pnpm lint              # ESLint
```

## Directory Structure

```
app/                        # Expo Router (PRIMARY)
├── (tabs)/                 # Tab navigation
│   ├── index.tsx           # Search tab (home)
│   └── profile.tsx         # Profile tab
├── _layout.tsx             # Root layout
├── disclaimer.tsx          # Medical disclaimer
├── privacy.tsx             # Privacy policy
├── terms.tsx               # Terms of service
└── oauth/                  # OAuth callbacks

server/                     # tRPC Backend
├── routers.ts              # All API endpoints
├── db.ts                   # Database helpers
├── stripe.ts               # Payment logic
├── storage.ts              # File storage
├── _core/                  # Framework internals
│   ├── index.ts            # Server entry point
│   ├── trpc.ts             # tRPC config + procedures
│   ├── claude.ts           # Claude SDK (Sonnet 4.5 / Haiku 4.5)
│   ├── embeddings.ts       # Voyage AI + Supabase pgvector
│   ├── supabase.ts         # Supabase client for protocols
│   ├── oauth.ts            # OAuth handling
│   ├── env.ts              # Environment validation
│   └── ...
└── webhooks/               # Stripe webhooks

drizzle/                    # Database
├── schema.ts               # Table definitions
├── relations.ts            # Table relationships
└── *.sql                   # Auto-generated migrations

components/                 # UI Components
├── ui/                     # Base UI components
└── [feature].tsx           # Feature-specific components

lib/                        # Utility Functions
├── _core/                  # Core utilities
├── app-context.tsx         # App state context
├── offline-cache.ts        # Offline caching
└── trpc.ts                 # tRPC client

shared/                     # Cross-stack Types & Constants
├── const.ts                # Shared constants
└── types.ts                # TypeScript types

hooks/                      # Custom React Hooks
constants/                  # App constants
tests/                      # Tests
agents/                     # 37 Specialized AI Agents
docs/                       # Documentation
scripts/                    # Build & utility scripts
```

## Database Architecture

### Supabase (PostgreSQL + pgvector)
Connection: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`

**Tables:**
- **manus_protocol_chunks** - Protocol content with Voyage AI embeddings (55,000+ chunks)
- **manus_agencies** - EMS agencies with state grouping (2,738 agencies)
- **users** - Auth, subscriptions, query tracking
- **queries** - Search history & analytics
- **bookmarks** - Saved protocols

**Semantic Search:**
- pgvector similarity matching via `search_manus_protocols` RPC function
- Voyage AI embeddings (1536 dimensions)

## tRPC API Routers

| Router | Procedures | Description |
|--------|------------|-------------|
| `system` | health, status | Server health checks |
| `auth` | me, logout | Authentication state |
| `counties` | list, get | EMS agency data |
| `user` | usage, tierInfo, homeCounty, selectCounty | User management |
| `search` | semantic, getProtocol, stats, coverageByState | Protocol search |
| `query` | submit, history | AI-powered protocol queries |
| `voice` | transcribe, uploadAudio | Voice input support |
| `feedback` | submit, myFeedback | User feedback |
| `subscription` | createCheckout, createPortal, status | Stripe subscriptions |
| `bookmarks` | list, add, remove, toggle | Saved protocols |

## Common Tasks

### Add an API endpoint
1. Edit `server/routers.ts`
2. Use `publicProcedure` or `protectedProcedure`
3. Access via `trpc.[router].[procedure]` on client

### Modify database
1. Edit `drizzle/schema.ts`
2. Run `pnpm db:push`

## Environment Variables

### Required (Netlify)
```bash
# AI Services
ANTHROPIC_API_KEY=sk-ant-...      # Claude API
VOYAGE_API_KEY=pa-...              # Voyage AI embeddings

# Supabase (protocols database)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe Payments
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...

# Database
DATABASE_URL=postgres://...        # Supabase connection string

# Auth
JWT_SECRET=...
NEXT_AUTH_SECRET=...
NEXT_AUTH_URL=https://protocol-guide.com
```

## Deployment (Netlify)

### Auto-Deploy
1. Push to `main` branch
2. Netlify builds and deploys automatically

### Environment Variables
All environment variables are configured in Netlify dashboard.

### PWA Features
- **Offline Support**: Service worker caches critical assets
- **Install Prompt**: Users can add to home screen
- **Theme Color**: EMS red (#C41E3A)
- **Standalone Mode**: Runs like native app

## Agent Library

See `agents/AGENTS.md` for **37 specialized agents** covering:
- Design (5): Brand, UI, UX, Visual, Whimsy
- Engineering (7): AI, Backend, DevOps, Frontend, Mobile, Prototyper, Testing
- Marketing (7): ASO, Content, Growth, Instagram, Reddit, TikTok, Twitter
- Product (3): Feedback, Sprint, Trends
- Project Management (3): Experiments, Shipping, Production
- Studio Operations (5): Analytics, Finance, Infrastructure, Legal, Support
- Testing (5): API, Performance, Results, Evaluation, Workflow
- Bonus (2): Joker, Coach

## Project Stats

- 55,056 protocols
- 2,738 EMS agencies
- 53 US states/territories
- Subscription tiers: free/pro ($39/year or $4.99/month)

## Target Response Time

- **Goal**: 3-5 seconds for protocol retrieval
- **Haiku 4.5**: Fast, simple queries
- **Sonnet 4.5**: Complex, lengthy queries

## Code Standards

### File Size Limit: 500 Lines Max
**All code files must be under 500 lines.** This optimizes for:
- LLM retrieval (Voyage AI embeddings work better on focused content)
- Claude comprehension (both Haiku and Sonnet)
- Faster RAG responses

**If a file exceeds 500 lines, split it:**
```
server/routers.ts (too big)
  → server/routers/auth.ts
  → server/routers/search.ts
  → server/routers/query.ts
  → server/routers/index.ts (re-exports)

components/SearchPage.tsx (too big)
  → components/search/SearchInput.tsx
  → components/search/ResultsList.tsx
  → components/search/SearchPage.tsx
```

### Context7 MCP Required
**Always use Context7** for:
- Testing and test fixes
- Bug investigation
- Code review and implementation
- Library/framework lookups (Expo, tRPC, Drizzle, etc.)

```
mcp__context7__* → Fetch latest docs before coding
```

This ensures we use current APIs, not outdated patterns from training data.

### LLM-Optimized Code
Write code that's easy for Claude to understand:
- Clear function names (verb + noun)
- Single responsibility per function
- Comments on non-obvious logic
- Type everything explicitly
