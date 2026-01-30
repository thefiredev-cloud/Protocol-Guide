# Protocol Guide - Docker Development

Local development environment matching Railway production stack.

## Quick Start

```bash
# 1. Copy environment file
cp .env.docker.example .env.docker

# 2. Edit .env.docker with your API keys (Supabase, Anthropic, Voyage)

# 3. Start services (Postgres + Redis + API)
docker-compose up -d

# 4. Check health
docker-compose ps
curl http://localhost:3001/api/health
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| `postgres` | 5432 | PostgreSQL 15 (Supabase-compatible) |
| `redis` | 6379 | Redis 7 (Upstash-compatible) |
| `api` | 3001 | Express + tRPC backend |

## Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api
docker-compose logs -f postgres

# Stop services (keep data)
docker-compose down

# Stop and remove data
docker-compose down -v

# Rebuild after code changes
docker-compose up -d --build api

# Run with full frontend (optional)
docker-compose --profile full up -d

# Run in dev mode with hot reload
docker-compose --profile dev up -d
```

## Database Access

```bash
# Connect to Postgres
docker exec -it protocol-guide-db psql -U postgres -d protocol_guide

# Run migrations (from host)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/protocol_guide pnpm db:migrate
```

## Redis Access

```bash
# Connect to Redis CLI
docker exec -it protocol-guide-redis redis-cli

# Test connection
docker exec -it protocol-guide-redis redis-cli ping
```

## Troubleshooting

### API won't start
- Check logs: `docker-compose logs api`
- Ensure `.env.docker` has valid API keys
- Verify Postgres/Redis are healthy: `docker-compose ps`

### Database connection failed
- Wait for Postgres healthcheck: `docker-compose ps` should show "healthy"
- Check DATABASE_URL in `.env.docker`

### Port conflicts
- Stop local Postgres: `net stop postgresql-x64-15` (Windows)
- Stop local Redis: `redis-cli shutdown`
- Or change ports in `docker-compose.yml`

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Network                        │
│  ┌──────────┐   ┌──────────┐   ┌──────────────────────┐ │
│  │ Postgres │   │  Redis   │   │        API           │ │
│  │  :5432   │◄──│  :6379   │◄──│      :3001           │ │
│  └──────────┘   └──────────┘   └──────────────────────┘ │
└─────────────────────────────────────────────────────────┘
         ▲                              ▲
         │                              │
    localhost:5432                 localhost:3001
    (optional direct)              (your frontend)
```

## Production Parity

This Docker setup mirrors Railway:
- Same Node 20 runtime
- Same PostgreSQL 15
- Same Redis 7
- Same port (3001)
- Same health check endpoint
