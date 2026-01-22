# Protocol Guide (Manus) - AI Quick Reference

## Essential Commands
```bash
pnpm dev               # Full dev server
pnpm start             # Production server
pnpm db:push           # Apply DB migrations
pnpm test              # Run tests
pnpm check             # TypeScript check
pnpm lint              # ESLint
```

## Key Files to Read First
| File | Purpose |
|------|---------|
| `CLAUDE.md` | Full project context, architecture, env vars |
| `server/routers.ts` | All tRPC API endpoints |
| `drizzle/schema.ts` | Database tables |
| `server/_core/claude.ts` | Claude SDK integration (Sonnet 4.5 / Haiku 4.5) |
| `server/_core/embeddings.ts` | Voyage AI + Supabase pgvector |
| `app/(tabs)/index.tsx` | Search tab (home) |

## Directory Structure
```
app/               → Expo Router pages (tabs, profile)
server/            → tRPC backend (routers.ts = API)
server/_core/      → Claude SDK, Voyage AI, embeddings, env
drizzle/           → DB schema + migrations
components/        → UI components
lib/               → Utilities
hooks/             → React hooks
shared/            → Types & constants
tests/             → Tests
agents/            → 37 AI agents (see agents/AGENTS.md)
```

## Tech Stack
- **Frontend**: Expo 54, React Native Web, React 19
- **Styling**: NativeWind (Tailwind for RN), Tailwind CSS 3.4
- **State**: TanStack Query v5
- **Backend**: tRPC 11.7, Express
- **DB**: Supabase (PostgreSQL + pgvector)
- **AI**: Claude SDK (Sonnet 4.5 / Haiku 4.5) + Voyage AI embeddings
- **Auth**: Supabase Auth
- **Payments**: Stripe
- **Deploy**: Netlify PWA

## LLM Architecture
| Tier | Model | Cost/Query |
|------|-------|------------|
| Free | Haiku 4.5 | ~$0.0003 |
| Pro (simple) | Haiku 4.5 | ~$0.0003 |
| Pro (complex) | Sonnet 4.5 | ~$0.003 |

## Embeddings
- **Model**: Voyage AI `voyage-large-2` (1536 dimensions)
- **Search**: Supabase pgvector `search_manus_protocols` RPC

## Common Tasks

**Add a page**: Create `app/[route].tsx` or `app/[route]/index.tsx`

**Add API endpoint**: Edit `server/routers.ts` using `publicProcedure` or `protectedProcedure`

**Modify database**: Edit `drizzle/schema.ts`, then run `pnpm db:push`

## Watch Out For
- **Tiered LLM routing**: Free users get Haiku only, Pro gets Sonnet for complex queries
- **Two main files for AI**: `claude.ts` (LLM) and `embeddings.ts` (vector search)
- **Supabase pgvector**: Semantic search via `search_manus_protocols` RPC function
- **PWA-first**: This is NOT an app store app - it's installed via browser
- **Response time goal**: 3-5 seconds for protocol retrieval
