<<<<<<< HEAD
# Sahayasetu
=======
# SahayaSetu — Help Request & Field Verification Platform

A production-grade, enterprise-scale help request management platform with citizen app, field agent app, admin dashboard, and real-time tracking.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS (microservices), Node.js 20 |
| Mobile | React Native + Expo SDK 51 |
| Web Admin | Next.js 14 (App Router) |
| Primary DB | PostgreSQL 16 |
| Media/Meta DB | MongoDB Atlas |
| Cache / Queue | Redis 7 |
| File Storage | AWS S3 |
| Real-time | Socket.io |
| Auth | JWT + OTP (Twilio) |
| CI/CD | GitHub Actions |
| Containers | Docker + Kubernetes |

---

## Project Structure

```
sahayasetu/
├── apps/
│   ├── web/               # Next.js admin dashboard
│   ├── mobile/            # Expo citizen app
│   └── mobile-agent/      # Expo field agent app
├── services/
│   ├── auth-service/      # JWT, OTP, RBAC (port 3001)
│   ├── request-service/   # Help requests, chat (port 3002)
│   ├── media-service/     # S3 upload, verification (port 3003)
│   ├── notification-service/ # Push, SMS, email (port 3004)
│   └── api-gateway/       # Proxy + rate limit (port 8080)
├── packages/
│   ├── types/             # Shared TypeScript types
│   ├── utils/             # Shared utilities
│   └── config/            # Shared NestJS config
└── infrastructure/
    ├── docker/            # Docker Compose files
    ├── k8s/               # Kubernetes manifests
    └── ci-cd/             # GitHub Actions
```

---

## Prerequisites

- Node.js >= 20
- pnpm >= 9 (`npm install -g pnpm`)
- Docker + Docker Compose
- MongoDB Atlas account (free tier works)
- AWS account (for S3)
- Twilio account (for OTP SMS)

---

## Quick Start (Local Development)

### 1. Clone and install

```bash
git clone https://github.com/your-org/sahayasetu.git
cd sahayasetu
pnpm install
```

### 2. Configure environment

```bash
# Copy example env files for each service
cp services/auth-service/.env.example services/auth-service/.env
cp services/request-service/.env.example services/request-service/.env
cp services/media-service/.env.example services/media-service/.env
cp services/notification-service/.env.example services/notification-service/.env

# Edit each .env with your credentials
```

Minimum required values in each `.env`:
- `MONGODB_URI` — your MongoDB Atlas connection string
- `JWT_SECRET` — a long random string
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_S3_BUCKET`
- `TWILIO_*` — for OTP SMS (skip in dev, OTP logs to console)

### 3. Start infrastructure

```bash
# Starts PostgreSQL + Redis via Docker
pnpm docker:dev

# Or manually:
docker-compose -f infrastructure/docker/docker-compose.dev.yml up -d
```

### 4. Run all services

```bash
# Run everything with Turborepo
pnpm dev

# Or run individual services:
cd services/auth-service && pnpm start:dev
cd services/request-service && pnpm start:dev
cd services/media-service && pnpm start:dev
cd services/notification-service && pnpm start:dev
```

### 5. Run admin dashboard

```bash
cd apps/web
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
pnpm dev
# Open http://localhost:3000
```

### 6. Run mobile apps

```bash
# Citizen app
cd apps/mobile
pnpm start

# Field agent app
cd apps/mobile-agent
pnpm start
```

---

## Service Ports

| Service | Port | Swagger |
|---|---|---|
| API Gateway | 8080 | — |
| Auth Service | 3001 | http://localhost:3001/api/v1/docs |
| Request Service | 3002 | http://localhost:3002/api/v1/docs |
| Media Service | 3003 | http://localhost:3003/api/v1/docs |
| Notification Service | 3004 | http://localhost:3004/api/v1/docs |
| Admin Dashboard | 3000 | — |

---

## Core API Endpoints

### Auth Service (`/api/v1/auth`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/otp/send` | Send OTP to phone |
| POST | `/otp/verify` | Verify OTP + login |
| POST | `/register` | Register with password |
| POST | `/login` | Login with password |
| POST | `/refresh` | Refresh access token |
| POST | `/logout` | Logout + revoke tokens |
| GET | `/me` | Get current user |
| PATCH | `/me` | Update profile |

### Request Service (`/api/v1/requests`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/` | Create help request |
| GET | `/` | List requests (role-filtered) |
| GET | `/:id` | Get request detail |
| PATCH | `/:id/status` | Update request status |
| PATCH | `/:id/assign` | Assign to agent (admin) |
| POST | `/:id/rate` | Rate completed request |
| GET | `/stats` | Dashboard statistics |

### Media Service (`/api/v1/media`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/upload` | Upload media file |
| POST | `/presigned` | Get presigned S3 URL |
| GET | `/request/:id` | List media for request |
| GET | `/:id/signed-url` | Signed download URL |
| GET | `/admin/flagged` | Flagged media (admin) |

---

## Running Tests

```bash
# All tests
pnpm test

# Specific service
cd services/auth-service && pnpm test

# With coverage
pnpm test -- --coverage

# E2E tests
pnpm test:e2e
```

---

## Docker Production Build

```bash
# Build and start all services
docker-compose -f infrastructure/docker/docker-compose.yml up --build -d

# View logs
docker-compose -f infrastructure/docker/docker-compose.yml logs -f auth-service

# Scale a service
docker-compose -f infrastructure/docker/docker-compose.yml up -d --scale request-service=3
```

---

## Environment Variables Reference

| Variable | Service | Description |
|---|---|---|
| `MONGODB_URI` | media, notification | MongoDB Atlas connection string |
| `POSTGRES_*` | auth, request | PostgreSQL connection |
| `REDIS_HOST/PORT/PASSWORD` | all | Redis connection |
| `JWT_SECRET` | all | Must be same across all services |
| `AWS_ACCESS_KEY_ID` | media | S3 credentials |
| `AWS_SECRET_ACCESS_KEY` | media | S3 credentials |
| `AWS_S3_BUCKET` | media | S3 bucket name |
| `TWILIO_ACCOUNT_SID` | auth, notification | Twilio credentials |
| `TWILIO_AUTH_TOKEN` | auth, notification | Twilio credentials |
| `FIREBASE_SERVICE_ACCOUNT` | notification | Firebase Admin SDK JSON |
| `SMTP_HOST/USER/PASS` | notification | Email credentials |

---

## User Roles

| Role | Capabilities |
|---|---|
| `USER` | Create requests, upload media, chat, rate service |
| `FIELD_AGENT` | View assigned requests, update status, upload verification |
| `ADMIN` | Full access, assign agents, view analytics, fraud alerts |

---

## Deployment (AWS ECS)

The CI/CD pipeline in `.github/workflows/ci.yml` automatically:

1. Lints and type-checks all packages
2. Runs unit tests with PostgreSQL + Redis
3. Builds Docker images for all 5 services
4. Pushes to ECR on `main` branch
5. Triggers ECS rolling deployments

Set these GitHub Secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `JWT_SECRET`
- `MONGODB_URI`
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN`
- `MONGODB_TEST_URI`
- `CODECOV_TOKEN`

---

## Mobile App Build (Expo EAS)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build Android APK
cd apps/mobile
eas build --platform android --profile preview

# Build iOS IPA
eas build --platform ios --profile preview

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

---

## License

MIT © SahayaSetu Team
>>>>>>> 9e1fa30 (first commit)
