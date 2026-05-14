# 🚀 GlobalTransact - Setup & Deployment Guide

## Overview

GlobalTransact is a financial transaction platform with microservices architecture. This guide covers setup, deployment, and the new currency management system.

---

## 📋 Prerequisites

- **Node.js** v18+ (for running services locally)
- **Docker** & **Docker Compose** (for containerized deployment)
- **npm** (comes with Node.js)
- **Git** (for version control)

---

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd globaltransact
```

### 2. Install All Dependencies

```bash
npm run install-all
```

This installs dependencies for:
- Core API service
- Forex service
- Notification service
- Web frontend

---

## 🚀 Running Services

### Option A: Local Development (Recommended for Development)

#### Using npm (All platforms):

```bash
npm start
```

This uses `concurrently` to run all services in one terminal:
- Core API (Port 3001)
- Forex Service (Port 3002)
- Web Frontend (Port 3000)

**Note:** Requires Docker running for PostgreSQL & Redis

#### Windows Only:

```bash
# Using batch file
start.bat

# Or PowerShell
powershell -ExecutionPolicy Bypass -File start.ps1
```

#### Linux/macOS:

```bash
chmod +x start.sh
./start.sh
```

### Option B: Docker Compose (Production-like)

#### Start all services in containers:

```bash
npm run start:docker
```

#### Start in background:

```bash
npm run start:docker-daemon
```

View logs:
```bash
npm run logs
```

Stop services:
```bash
npm run stop
```

### Option C: Start Individual Services

```bash
npm run start:core        # Core API only
npm run start:forex       # Forex Service only
npm run start:web         # Web Frontend only
```

---

## 💱 Currency Management System

The new currency management system allows admins to configure exchange rates with two modes:

### 📡 Automatic Mode
- System fetches real-time exchange rates from a live API
- Perfect for worldwide sales with dynamic pricing
- Automatic fallback to last known rate if API fails
- Set spread/margin for your platform

### ✋ Manual Mode
- Admin manually sets exchange rates
- Fixed rates for stable pricing strategy
- Control over exact rates and spreads

### How to Use (Admin Panel)

1. **Access Currency Settings**
   - Navigate to: `http://localhost:3000/admin/currencies`
   - (Admin role required)

2. **View All Currency Pairs**
   - RWF_GHS, RWF_UGX, RWF_KES, RWF_USD, etc.
   - See current mode and rates for each

3. **Switch Modes**
   - Click "🔄 Automatic" or "✋ Manual"
   - System updates rate immediately

4. **Set Manual Rates**
   - Click "✏️ Edit" in Manual Mode
   - Enter exchange rate (e.g., 1.25)
   - Set spread percentage (e.g., 2.5% = 0.025)
   - Click "Save"

5. **Adjust Spread**
   - Modify the markup/margin on exchange rates
   - Higher spread = higher profit margin
   - Lower spread = more competitive pricing

6. **Toggle Active/Inactive**
   - Use the toggle button to enable/disable a currency pair
   - Inactive pairs cannot be used for transfers

### API Endpoints (Backend)

```
GET    /api/v1/admin/currencies              - Get all currency settings
GET    /api/v1/admin/currencies/:corridor    - Get specific currency
POST   /api/v1/admin/currencies/:corridor/manual-rate    - Set manual rate
POST   /api/v1/admin/currencies/:corridor/automatic-mode - Enable automatic
PUT    /api/v1/admin/currencies/:corridor/spread        - Update spread
PUT    /api/v1/admin/currencies/:corridor/status        - Toggle active status
```

Example requests:

```bash
# Get all currencies
curl http://localhost:3001/api/v1/admin/currencies \
  -H "Authorization: Bearer YOUR_TOKEN"

# Set manual rate for RWF_GHS
curl -X POST http://localhost:3001/api/v1/admin/currencies/RWF_GHS/manual-rate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "manualRate": 1.25,
    "spread": 0.025
  }'

# Enable automatic mode
curl -X POST http://localhost:3001/api/v1/admin/currencies/RWF_GHS/automatic-mode \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Database Schema

New database tables for currency management:

```sql
-- CurrencySetting Table
CREATE TABLE CurrencySetting (
  id SERIAL PRIMARY KEY,
  corridor VARCHAR(20) UNIQUE,      -- RWF_GHS, RWF_UGX, etc.
  mode VARCHAR(20),                 -- AUTOMATIC or MANUAL
  manualRate DECIMAL(15, 6),        -- Manual rate value
  spread DECIMAL(5, 4),             -- Spread percentage
  isActive BOOLEAN DEFAULT true,    -- Currency pair active?
  lastRate DECIMAL(15, 6),          -- Last used rate
  lastFetchedAt TIMESTAMP,          -- When rate was last updated
  autoFallbackRate DECIMAL(15, 6),  -- Fallback if auto fetch fails
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Foreign key relationship with ForexRate table
ALTER TABLE CurrencySetting ADD CONSTRAINT fk_currencysetting_forexrate
  FOREIGN KEY (id) REFERENCES ForexRate(id);
```

### Environment Variables

Add to `.env` files:

```bash
# Exchange rate API (for automatic mode)
FOREX_API_KEY=your_api_key_here

# Supported API: exchangerate-api.com
# Sign up free at: https://www.exchangerate-api.com/
# Free tier: 1,500 requests/month
```

---

## 📊 Database Management

### Run Migrations

```bash
npm run db:migrate
```

### Push Schema to Database

```bash
npm run db:push
```

### Seed Initial Data

```bash
npm run db:seed
```

---

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Test Backend Only

```bash
npm --prefix services/core run test
```

### Test Frontend Only

```bash
npm --prefix web run test
```

---

## 📝 Useful Commands

```bash
# View service health
curl http://localhost:3001/healthz      # Core API
curl http://localhost:3001/readyz       # Database ready check

# Database commands
npm run db:migrate                       # Run migrations
npm run db:push                          # Push schema
npm run db:seed                          # Seed data

# Logging
npm run logs                             # All services
npm run logs:core                        # Core API only
npm run logs:db                          # Database only

# Installation
npm run install-all                      # Install all dependencies

# Start
npm start                                # All services (local)
npm run start:docker                     # All services (Docker)
npm run start:docker-daemon              # Docker background

# Stop
npm run stop                             # Stop all Docker services
```

---

## 🏗️ Project Structure

```
globaltransact/
├── services/
│   ├── core/                 # Main API service
│   │   ├── src/
│   │   │   ├── index.js      # Express app entry
│   │   │   ├── middleware/   # Auth, validation, logging
│   │   │   ├── routes/       # API endpoints
│   │   │   ├── services/     # Business logic (including currencyService.js)
│   │   │   └── utils/        # Helpers, Prisma, logger
│   │   ├── prisma/
│   │   │   └── schema.prisma # Database schema
│   │   └── package.json
│   ├── forex/                # Forex rate service
│   ├── momo/                 # Mobile Money integration
│   └── notification/         # Notification service
├── web/                      # React frontend
│   ├── src/
│   │   ├── pages/            # Page components (including AdminCurrencyPage.js)
│   │   ├── components/       # Reusable components
│   │   ├── context/          # Auth context
│   │   └── api/              # API helpers
│   └── package.json
├── docker-compose.yml        # Service orchestration
├── package.json              # Root package.json
├── start.sh                  # Linux/macOS startup script
├── start.bat                 # Windows batch startup
├── start.ps1                 # Windows PowerShell startup
└── README.md
```

---

## 🔐 Security Considerations

- **Authentication**: JWT-based with bcrypt password hashing
- **Rate Limiting**: Implemented on all API endpoints
- **CORS**: Configured for frontend domain only
- **Helmet**: Security headers middleware
- **Audit Logging**: All admin actions logged
- **Input Validation**: Zod schema validation

---

## 🚨 Troubleshooting

### Port Already in Use

```bash
# Windows: Find process on port 3000
netstat -ano | findstr :3000

# Linux/macOS: Find process on port 3000
lsof -i :3000

# Kill process (e.g., PID 1234)
kill -9 1234
```

### Docker Connection Issues

```bash
# Restart Docker
docker-compose restart

# Full reset (WARNING: deletes data)
docker-compose down -v
docker-compose up -d
```

### Database Migration Errors

```bash
# Reset database
npm run db:push --force

# Re-run seed
npm run db:seed
```

### Cannot Connect to API

```bash
# Check API health
curl http://localhost:3001/healthz

# Check database connection
curl http://localhost:3001/readyz

# View logs
npm run logs:core
```

---

## 📖 API Documentation

### Health Checks

```
GET /healthz                 # Service alive check
GET /readyz                  # Database ready check
```

### Authentication Routes

```
POST   /api/v1/auth/register          # Register new user
POST   /api/v1/auth/login             # User login
POST   /api/v1/auth/logout            # User logout
GET    /api/v1/auth/me                # Current user info
POST   /api/v1/auth/forgot-password   # Initiate password reset
POST   /api/v1/auth/reset-password    # Complete password reset
```

### Transfer Routes

```
POST   /api/v1/transfers              # Initiate transfer
GET    /api/v1/transfers              # List user's transfers
GET    /api/v1/transfers/:id          # Get transfer details
POST   /api/v1/transfers/:id/approve  # Admin: Approve transfer
POST   /api/v1/transfers/:id/reject   # Admin: Reject transfer
```

### Admin Routes

```
# Liquidity Management
GET    /api/v1/admin/liquidity                      # View pools
POST   /api/v1/admin/liquidity/topup                # Add funds

# Agent Management
GET    /api/v1/admin/agents                        # List agents
POST   /api/v1/admin/agents                        # Create agent
POST   /api/v1/admin/agents/:agentId/wallet/topup  # Fund agent

# Currency Management (NEW)
GET    /api/v1/admin/currencies                              # All currencies
GET    /api/v1/admin/currencies/:corridor                    # Specific currency
POST   /api/v1/admin/currencies/:corridor/manual-rate        # Set manual rate
POST   /api/v1/admin/currencies/:corridor/automatic-mode     # Enable automatic
PUT    /api/v1/admin/currencies/:corridor/spread             # Update spread
PUT    /api/v1/admin/currencies/:corridor/status             # Toggle active
```

---

## 🎯 Next Steps

1. **Initial Setup**: Run `npm run install-all`
2. **Start Services**: Use `npm start` or preferred startup script
3. **Database**: Run migrations with `npm run db:migrate`
4. **Access App**: Open `http://localhost:3000` in browser
5. **Configure Currencies**: Go to Admin → Currency Management
6. **Configure Rates**: Choose Automatic or Manual for each currency pair

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review service logs: `npm run logs`
3. Check API health: `curl http://localhost:3001/healthz`
4. Review console output for error messages

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🔄 Version History

### v1.0.0 - Initial Release
- Core API with authentication
- Transfer management system
- Liquidity pool management
- Admin dashboard

### v1.1.0 - Currency Management (Current)
- Automatic exchange rate fetching
- Manual rate configuration
- Spread adjustment
- Admin currency settings UI
- Multi-service startup scripts

---

**Happy transacting! 🎉**
