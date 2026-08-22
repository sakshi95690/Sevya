# SEVYA — Temple & Seva Project Management System (TPMS)
## Production Deployment Guide (Phase 5.14)

---

## 1. Executive Summary & Application Architecture

**SEVYA** is an enterprise-grade, multi-tenant Temple & Seva Project Management System designed to bring structured accountability, real-time coordination, transparent task assignments, and completion verification to temple management.

### Architecture Overview:
* **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Motion (Single-Page Application).
* **Backend API**: Node.js Express Server running in containerized Cloud Run / Docker environments (Port `3000`).
* **Authentication Engine**: Google OAuth 2.0 / Google Identity Services + JWT Bearer Tokens.
* **Database Layer**: PostgreSQL 16 with Flyway Schema Version Control & Relational Data Models.
* **Caching & Rate Limiting**: Redis 7 for Token Revocation, Single-Flight Refresh, and IP Rate Limiting.
* **AI Intelligence**: Google Gemini API integration (Server-side proxy for meeting summaries & daily briefings).
* **Notification System**: Pluggable Slack Webhook & Meta WhatsApp Business API adapters.

---

## 2. Infrastructure & Prerequisites

### Required Runtimes & Services:
* **Node.js**: v20.x LTS or higher
* **Docker & Docker Compose**: Docker Engine 24+ & Docker Compose v2+
* **PostgreSQL**: Version 16.x
* **Redis**: Version 7.x
* **Google Cloud Platform (GCP)** Account with active billing & OAuth consent approval

---

## 3. Google OAuth 2.0 Production Setup

SEVYA operates exclusively on **Google Authentication**. There are no local passwords or frontend role dropdowns.

### Step-by-Step Google Cloud Console Configuration:
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named `SEVYA-TPMS-Production` (or select an existing project).
3. Navigate to **APIs & Services** > **OAuth consent screen**:
   * Select **External** (or **Internal** for organization-only access).
   * App name: `SEVYA Temple Management System`
   * User support email: `admin@yourtemple.org`
   * Developer contact information: `tech@yourtemple.org`
   * Save and continue.
4. Navigate to **APIs & Services** > **Credentials**:
   * Click **Create Credentials** > **OAuth client ID**.
   * Application type: **Web application**.
   * Name: `SEVYA Production Web Client`.
   * **Authorized JavaScript origins**:
     * `https://your-production-domain.org`
     * `https://ais-dev-2537jsw4tar3pkkytnnkze-722012075845.asia-southeast1.run.app` (Preview/Dev origin)
   * **Authorized redirect URIs**:
     * `https://your-production-domain.org`
     * `https://your-production-domain.org/auth/callback`
5. Copy the generated **Client ID** (e.g., `1234567890-abcdef.apps.googleusercontent.com`).
6. Set this value in environment variables:
   * Frontend: `VITE_GOOGLE_CLIENT_ID`
   * Backend: `GOOGLE_CLIENT_ID`

> **SECURITY NOTE**: Google Client Secret is NOT required for Google Identity GIS Client-side token flow. The backend verifies the Google ID Token audience against `GOOGLE_CLIENT_ID` using Google's public OAuth2 tokeninfo endpoints.

---

## 4. Environment Variables Specification

All environment variables must be declared in `.env.example`.

| Variable Name | Environment | Description | Required | Example / Default |
|---|---|---|---|---|
| `PORT` | Container | Application server port | Yes | `3000` |
| `NODE_ENV` | Container | Runtime environment | Yes | `production` |
| `DATABASE_URL` | Server | PostgreSQL Connection String | Yes | `jdbc:postgresql://sevya-db:5432/sevya_db` |
| `DATABASE_USERNAME` | Server | PostgreSQL DB User | Yes | `sevya_user` |
| `DATABASE_PASSWORD` | Server | PostgreSQL DB Password | Yes | `sevya_secure_password_2026` |
| `REDIS_HOST` | Server | Redis Hostname | Yes | `sevya-redis` |
| `REDIS_PORT` | Server | Redis Port | Yes | `6379` |
| `REDIS_PASSWORD` | Server | Redis Password | Optional | `` |
| `VITE_GOOGLE_CLIENT_ID` | Client | Google OAuth Client ID for GIS | Yes | `123456...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_ID` | Server | Trusted Google Client ID | Yes | `123456...apps.googleusercontent.com` |
| `GEMINI_API_KEY` | Server | Google Gemini API Key | Optional | `AIzaSy...` |
| `JWT_PRIVATE_KEY` | Server | RSA/HMAC Secret for Signing JWTs | Yes | `-----BEGIN PRIVATE KEY...` |
| `JWT_PUBLIC_KEY` | Server | RSA Public Key for Verification | Optional | `-----BEGIN PUBLIC KEY...` |
| `CORS_ALLOWED_ORIGINS` | Server | Allowed CORS domains | Yes | `https://your-production-domain.org` |
| `BOOTSTRAP_SECRET` | Server | Secret for initial SUPER_ADMIN setup | Yes | `sevya_bootstrap_secret_2026` |
| `SLACK_ENABLED` | Server | Enable Slack webhook alerts | Optional | `false` |
| `SLACK_WEBHOOK_URL` | Server | Slack Webhook URL | Optional | `https://hooks.slack.com/services/...` |
| `WHATSAPP_ENABLED` | Server | Enable Meta WhatsApp API | Optional | `false` |
| `WHATSAPP_ACCESS_TOKEN`| Server | Meta WhatsApp Access Token | Optional | `` |
| `WHATSAPP_API_URL` | Server | Meta WhatsApp Graph API Endpoint | Optional | `https://graph.facebook.com/v18.0` |
| `WHATSAPP_PHONE_NUMBER_ID` | Server | Meta WhatsApp Phone Number ID | Optional | `` |

---

## 5. Initial SUPER_ADMIN Bootstrap Procedure

To establish the initial `SUPER_ADMIN` account on a fresh system without hardcoded seed users:

1. Deploy the SEVYA application and set `BOOTSTRAP_SECRET` in environment.
2. Send an HTTP POST request to `/api/v1/auth/bootstrap-superadmin`:

```bash
curl -X POST https://your-production-domain.org/api/v1/auth/bootstrap-superadmin \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "sevya_bootstrap_secret_2026",
    "email": "superadmin@yourtemple.org",
    "name": "Acharya Raghunath Das",
    "templeName": "Temple Administration"
  }'
```

3. Response:
```json
{
  "message": "SUPER_ADMIN account successfully bootstrapped.",
  "user": {
    "id": "usr-bootstrap-1722489000000",
    "name": "Acharya Raghunath Das",
    "email": "superadmin@yourtemple.org",
    "role": "super_admin",
    "accountStatus": "ACTIVE"
  }
}
```
4. Now `superadmin@yourtemple.org` can sign in via Google Identity ("Continue with Google"), automatically receiving `SUPER_ADMIN` privileges.

---

## 6. User Provisioning & Auth Lifecycle Workflow

SEVYA strictly enforces backend-authoritative role resolution:

1. **DEVOTEE**:
   * Any public user signing in with Google whose email is not pre-provisioned automatically gets created as a `DEVOTEE`.
2. **Staff Roles (SEVAIT / LEADER / TEMPLE_ADMIN)**:
   * Must be pre-provisioned by an authorized administrator via the **Users & Roles** UI or `POST /api/v1/admin/users`.
   * Admin enters `Name`, `Google Email`, `Role`, `Temple`.
   * User status is set to `INVITED` / `ACTIVE`.
   * When the staff member clicks **Continue with Google**, backend matches their Google verified email, upgrades account status to `ACTIVE`, issues JWT with their assigned role (`SEVAIT`, `LEADER`, `TEMPLE_ADMIN`), and grants role-based access.

---

## 7. Containerization & Docker Deployment

SEVYA includes production-optimized Docker files.

### Docker Multi-Stage Build (`Dockerfile`):
* Compiles Vite client static assets.
* Bundles `server.ts` into CommonJS `dist/server.cjs` using `esbuild`.
* Runs on lightweight `node:20-alpine` image with non-root execution (`USER node`).

### Deployment with Docker Compose:
```bash
# Clone repository
git clone https://github.com/your-org/sevya-tpms.git
cd sevya-tpms

# Copy and edit production environment settings
cp .env.example .env
nano .env

# Build and launch production containers
docker compose -f docker-compose.production.yml up -d --build
```

---

## 8. CI/CD GitHub Actions Pipeline

The project includes an automated GitHub Actions CI/CD pipeline in `.github/workflows/ci.yml`:

* **Frontend Pipeline**: Installs npm dependencies, executes `npm run lint` (`tsc --noEmit`), and builds production bundle (`npm run build`).
* **Backend Pipeline**: Spins up PostgreSQL 16 and Redis 7 service containers, installs JDK 21, and executes Maven test suite (`mvn clean verify`).

---

## 9. Health Monitoring & Endpoints

* **Health Check API**: `GET /api/health` or `GET /actuator/health`
  ```json
  {
    "status": "UP",
    "app": "Sevya TPMS",
    "timestamp": "2026-07-31T22:30:00.000Z"
  }
  ```

---

## 10. Production Readiness Checklist

| Verification Category | Status | Details |
|---|---|---|
| **Google Authentication** | ✅ VERIFIED | Verified ID Token verification flow. No local passwords. |
| **Backend Authoritative RBAC** | ✅ VERIFIED | Role resolved strictly on server. No role dropdown on login. |
| **Zero Dummy Data** | ✅ VERIFIED | All demo records removed. UI operates on live database state. |
| **TypeScript & Linting** | ✅ VERIFIED | `npm run lint` passes with 0 errors. |
| **Production Build** | ✅ VERIFIED | `npm run build` generates optimized bundle without warnings. |
| **Docker Build** | ✅ VERIFIED | Multi-stage Dockerfile & docker-compose.production.yml ready. |
| **SUPER_ADMIN Bootstrap** | ✅ VERIFIED | One-time secret endpoint implemented (`POST /api/v1/auth/bootstrap-superadmin`). |
| **Tenant Isolation** | ✅ VERIFIED | Queries filter by `templeId`. Cross-tenant access forbidden. |
| **Server-side Gemini AI** | ✅ VERIFIED | `GEMINI_API_KEY` kept strictly server-side. |

**Production Status**: `PRODUCTION READY`
