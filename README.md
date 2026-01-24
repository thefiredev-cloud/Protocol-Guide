# 🚑 Protocol Guide

> The modern protocol retrieval tool for EMS professionals. Find the right protocol in 2 seconds, not 2 minutes.

[![Expo](https://img.shields.io/badge/Expo-54-000020?style=flat&logo=expo&logoColor=white)](https://expo.dev)
[![React Native Web](https://img.shields.io/badge/React_Native_Web-0.21-61DAFB?style=flat&logo=react&logoColor=white)](https://necolas.github.io/react-native-web/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com)
[![Claude AI](https://img.shields.io/badge/Claude_AI-Anthropic-191919?style=flat)](https://www.anthropic.com/claude)
[![Netlify](https://img.shields.io/badge/Netlify-Deployed-00C7B7?style=flat&logo=netlify&logoColor=white)](https://www.netlify.com)

**[Visit Protocol Guide](https://protocol-guide.com)** • **[GitHub](https://github.com/thefiredev-cloud/Protocol-Guide)** • **[Report Issue](https://github.com/thefiredev-cloud/Protocol-Guide/issues)**

---

## Overview

Protocol Guide is a Progressive Web App (PWA) that revolutionizes how EMS personnel access medical protocols. Using natural language search powered by Claude AI and semantic embeddings, paramedics and EMTs can instantly find the exact protocol they need during critical moments.

**Key Benefits:**
- **Lightning Fast**: Sub-2 second response times for protocol retrieval
- **Natural Language**: Ask questions like you'd ask a colleague
- **Works Offline**: Service worker caching ensures access even without connectivity
- **No App Store Required**: Install directly to your phone/tablet home screen via web
- **Comprehensive Coverage**: 55,000+ protocol chunks across all 50 states plus territories
- **Smart AI**: Contextual responses using Claude Haiku 4.5 and Sonnet 4.5

---

## Key Statistics

| Metric | Value |
|--------|-------|
| **Protocol Chunks** | 55,000+ |
| **EMS Agencies Covered** | 2,738 |
| **States & Territories** | 53 |
| **Average Response Time** | <2 seconds |
| **Lines of Code** | 29,700+ |
| **API Endpoints** | 26 |
| **Components** | 35 |
| **AI Models** | Claude Haiku 4.5 & Sonnet 4.5 |

---

## Features

### 🔍 Natural Language Search
Ask questions in plain English: "What's the dosage for epi in anaphylaxis?" or "Pediatric cardiac arrest protocol"

### 🤖 AI-Powered Responses
- **Free Tier**: Claude Haiku 4.5 for quick protocol lookups
- **Pro Tier**: Claude Sonnet 4.5 for complex, multi-protocol queries
- Semantic search using Voyage AI embeddings + Supabase pgvector

### 🎙️ Voice Input
Speak your query when time is critical—hands-free protocol access in the field

### 📱 Progressive Web App
- Install to home screen like a native app
- iOS-style UI using React Native Web
- Offline mode with service worker caching
- No app store review delays

### 🔖 Bookmarks & History
Save frequently-used protocols and track your search history

### 💳 Flexible Subscriptions
- **Free**: Basic protocol search with Haiku 4.5
- **Pro**: Advanced queries, full protocol access ($4.99/month or $39/year)

---

## Tech Stack

### Frontend
- **Expo 54** - Cross-platform framework
- **React Native Web 0.21** - Native UI components for web
- **React 19.1** - Latest React features
- **Expo Router** - File-based routing (`app/` directory)
- **NativeWind 4.2** - Tailwind CSS for React Native
- **TanStack Query v5** - Data fetching and state management

### Backend
- **tRPC 11.7** - End-to-end typesafe APIs
- **Express** - HTTP server
- **Node.js** - Runtime environment

### Database & AI
- **Supabase** - PostgreSQL + pgvector for semantic search
- **Anthropic Claude SDK** - Haiku 4.5 & Sonnet 4.5 models
- **Voyage AI** - Text embeddings (voyage-large-2, 1536 dimensions)

### Infrastructure
- **Netlify** - Hosting and auto-deployment
- **Stripe** - Subscription payments
- **Supabase Auth** - Google/Apple OAuth

---

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/thefiredev-cloud/Protocol-Guide.git
cd "Protocol Guide Manus"

# Install dependencies
pnpm install

# Set up environment variables (see .env.example)
cp .env.example .env.local

# Run database migrations
pnpm db:push

# Start development server
pnpm dev
```

### Environment Variables

See `CLAUDE.md` for the complete list of required environment variables:
- `ANTHROPIC_API_KEY` - Claude API access
- `VOYAGE_API_KEY` - Voyage AI embeddings
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` - Database
- `STRIPE_SECRET_KEY` - Payment processing
- `DATABASE_URL` - PostgreSQL connection string

---

## Project Structure

```
app/                        # Expo Router (file-based routing)
├── (tabs)/                 # Tab navigation
│   ├── index.tsx           # Search tab (home)
│   └── profile.tsx         # Profile tab
├── _layout.tsx             # Root layout
└── oauth/                  # OAuth callbacks

server/                     # tRPC Backend
├── routers.ts              # API endpoints
├── _core/                  # Framework internals
│   ├── claude.ts           # Claude SDK (Sonnet 4.5 / Haiku 4.5)
│   ├── embeddings.ts       # Voyage AI + pgvector
│   └── supabase.ts         # Supabase client
└── webhooks/               # Stripe webhooks

drizzle/                    # Database
├── schema.ts               # Table definitions
└── *.sql                   # Auto-generated migrations

components/                 # UI Components
lib/                        # Utility Functions
shared/                     # Cross-stack Types & Constants
hooks/                      # Custom React Hooks
```

---

## Development

### Common Commands

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

### Code Standards

- **File Size Limit**: 500 lines max (optimized for LLM comprehension)
- **TypeScript**: Explicit types everywhere
- **Context7 MCP**: Always fetch latest docs before implementation
- **LLM-Optimized**: Clear function names, single responsibility, comprehensive comments

---

## Documentation

- **[AI-CHEATSHEET.md](./AI-CHEATSHEET.md)** - Essential commands, structure, and gotchas
- **[agents/AGENTS.md](./agents/AGENTS.md)** - 37 specialized AI agents for development
- **[CLAUDE.md](./CLAUDE.md)** - Project configuration and architecture details

---

## Deployment

Protocol Guide is deployed via Netlify with auto-deployment from the `main` branch.

### PWA Features
- **Offline Support**: Service worker caches critical assets
- **Install Prompt**: Users can add to home screen
- **Theme Color**: EMS red (#C41E3A)
- **Standalone Mode**: Runs like a native app

---

## Distribution Strategy

**PWA via Netlify** (NOT App Store)
- Users visit the website and "Add to Home Screen"
- Works offline with service worker caching
- iOS-style UI using React Native Web
- No app store review process or fees
- Instant updates without app store approval delays

---

## LLM Architecture

### Tiered Routing
```
Free tier → Haiku 4.5 only (~$0.0003-0.0005/query)
Pro simple → Haiku 4.5 (~$0.0003-0.0005/query)
Pro complex → Sonnet 4.5 (~$0.002-0.004/query)
```

### Semantic Search
- **Voyage AI** embeddings (1536 dimensions)
- **Supabase pgvector** for similarity matching
- **Batch Size**: 128 (Voyage max)

### Response Time Target
- **Goal**: 3-5 seconds for protocol retrieval
- **Haiku 4.5**: Fast, simple queries
- **Sonnet 4.5**: Complex, lengthy queries

---

## Contributing

We welcome contributions! Please see our contributing guidelines and code of conduct.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is proprietary software. All rights reserved.

---

## Support

- **Documentation**: See `CLAUDE.md` and `AI-CHEATSHEET.md`
- **Issues**: [GitHub Issues](https://github.com/thefiredev-cloud/Protocol-Guide/issues)
- **Email**: support@protocol-guide.com

---

## Acknowledgments

Built with:
- [Anthropic Claude](https://www.anthropic.com/claude) - AI language models
- [Voyage AI](https://www.voyageai.com/) - Text embeddings
- [Supabase](https://supabase.com) - Database and authentication
- [Expo](https://expo.dev) - Cross-platform framework
- [Netlify](https://www.netlify.com) - Hosting and deployment

---

**Protocol Guide** • Saving lives, one query at a time.
# Trigger rebuild
