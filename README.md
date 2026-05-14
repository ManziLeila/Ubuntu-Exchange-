# GlobalTransact

A financial transaction platform for cross-border money transfers (Rwanda ↔ Ghana, Uganda, Kenya, USD).

## Architecture

| Service | Port | Description |
|---|---|---|
| Core API | `4001` | Main backend — auth, transfers, users |
| Forex Service | `4002` | Exchange rates & spreads |
| MoMo Service | `4003` | MTN Mobile Money payments |
| Notification | `4004` | Email & SMS notifications |
| Web (Next.js) | `3000` | Frontend |

**Stack:** Node.js · Express · PostgreSQL · Prisma · Redis · Next.js 14 · Tailwind CSS

---

## Local Setup

### Prerequisites

- [Node.js 20+](https://nodejs.org)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — for PostgreSQL & Redis
- Git

### 1. Clone the repo

```bash
git clone https://github.com/ManziLeila/Ubuntu-Exchange-.git
cd Ubuntu-Exchange-
```

### 2. Set up environment variables

Copy the example files and fill in your values:

```bash
cp services/core/.env.example        services/core/.env
cp services/forex/.env.example       services/forex/.env
cp services/momo/.env.example        services/momo/.env
cp services/notification/.env.example services/notification/.env
cp web-v2/.env.local.example         web-v2/.env.local
```

The defaults in the `.env.example` files work for local development — you only need to add:
- `OPEN_EXCHANGE_RATES_APP_ID` in `services/forex/.env` (free at [openexchangerates.org](https://openexchangerates.org))
- `SENDGRID_API_KEY` in `services/notification/.env` (optional — emails will log to console without it)

### 3. Start PostgreSQL & Redis with Docker

```bash
docker-compose up postgres redis -d
```

This starts only the database and Redis (not the Node services).

### 4. Install dependencies

```bash
npm run install-all
```

### 5. Run database migrations

```bash
npm run db:push
```

### 6. Start all services

```bash
npm start
```

This runs Core, Forex, and the Web frontend concurrently with live reload.

To start a specific service only:

```bash
npm run start:core    # Core API on :4001
npm run start:forex   # Forex service on :4002
npm run start:web     # Frontend on :3000
```

### 7. Seed the database (optional)

```bash
npm run db:seed
```

---

## Running Everything with Docker (alternative)

If you prefer Docker for all services:

```bash
docker-compose up --build
```

---

## API Documentation

Once the core service is running, visit:

```
http://localhost:4001/api-docs
```

---

## Deployment on Render

This repo includes a `render.yaml` Blueprint for one-click deployment.

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New** → **Blueprint**
3. Connect your GitHub repo
4. Render will create all services automatically
5. Set these secrets manually in the Render dashboard:
   - `OPEN_EXCHANGE_RATES_APP_ID` (on `globaltransact-forex`)
   - `SENDGRID_API_KEY` (on `globaltransact-notification`)

> **Note:** The free tier on Render spins down after 15 minutes of inactivity. The first request after sleep may be slow.

---

## Environment Variables Reference

See the `.env.example` file in each service folder for the full list of variables.
