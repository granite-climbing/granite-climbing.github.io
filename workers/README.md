# Granite Climbing API Worker

Cloudflare Worker providing API endpoints for the Granite climbing app.

## Features

1. **Instagram Hashtag Search Proxy** (`GET /?hashtag=<tag>`)
   - Proxies Instagram Graph API hashtag searches
   - Keeps access token secure on server side
   - In-memory caching for 24 hours

2. **Beta Video Management** (`/beta-videos`)
   - `GET /beta-videos?problem=<slug>` - Retrieve submitted videos for a problem
   - `POST /beta-videos` - Submit new beta video link
   - Stores data in D1 database

## Project Structure

```
workers/
├── src/
│   ├── index.ts              # Main router
│   ├── handlers/
│   │   ├── hashtag.ts        # Instagram hashtag search handler
│   │   └── betaVideos.ts     # Beta video submission/retrieval
│   └── utils/
│       ├── response.ts       # HTTP response utilities
│       └── validation.ts     # Input validation utilities
├── schema.sql                # D1 database schema
├── wrangler.toml             # Cloudflare Worker configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies
```

## Setup & Deployment

See [docs/cloudflare-setup.md](../docs/cloudflare-setup.md) for detailed setup instructions.

### Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create D1 database:
   ```bash
   npx wrangler d1 create granite
   ```

3. Update `wrangler.toml` with database ID

4. Apply schema:
   ```bash
   npx wrangler d1 execute granite --file=./schema.sql
   ```

5. Set secrets:
   ```bash
   npx wrangler secret put INSTAGRAM_ACCESS_TOKEN
   npx wrangler secret put INSTAGRAM_USER_ID
   ```

6. Deploy:
   ```bash
   npx wrangler deploy
   ```

## Local Development

```bash
npm run dev
```

Worker will be available at `http://localhost:8787`

## Testing

```bash
# Test hashtag search
curl "http://localhost:8787/?hashtag=climbing"

# Test get beta videos
curl "http://localhost:8787/beta-videos?problem=test-problem"

# Test submit beta video
curl -X POST http://localhost:8787/beta-videos \
  -H "Content-Type: application/json" \
  -d '{"problemSlug":"test-problem","instagramUrl":"https://www.instagram.com/p/ABC123/"}'
```

## Environment Variables

**Secrets** (set via `wrangler secret put`):
- `INSTAGRAM_ACCESS_TOKEN` - Instagram Graph API access token
- `INSTAGRAM_USER_ID` - Instagram Business Account ID

**Variables** (set in `wrangler.toml`):
- `ALLOWED_ORIGIN` - CORS allowed origin

**Bindings**:
- `DB` - D1 database for beta videos
