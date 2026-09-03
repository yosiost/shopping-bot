# Shopping Bot 🛒

A family shopping-list and gift-voucher tracker with a WhatsApp bot front end and a web PWA, built with **Kotlin / Spring Boot** on the backend and **React + Vite** on the frontend.

Send "milk" to a WhatsApp number and it lands on a shared list your household can also view and manage from a phone-friendly web app — complete with Google sign-in, per-user aliases, and automatic gift-voucher balance tracking with expiry reminders.

## Features

- **WhatsApp bot** — add/remove items and check the list via WhatsApp messages (powered by Twilio).
- **Web app (PWA)** — a installable, mobile-first React app for the same shared lists, with Google Sign-In.
- **Two lists** — separate "Shopping" and "Home" item lists.
- **Gift voucher tracker** — store voucher numbers/balances and auto-refresh balances from supported Israeli providers (BuyMe, KsharimPlus, Praxell).
- **Expiry reminders** — a daily scheduled job WhatsApps a summary of vouchers expiring within a month.
- **Access control** — restrict login to an allow-list of email addresses; a separate allow-list can gate who sees the voucher tab.
- **Persistent sessions** — sessions are stored in the database so a server restart doesn't log anyone out.

## Tech stack

| Layer      | Tech                                                             |
|------------|-------------------------------------------------------------------|
| Backend    | Kotlin, Spring Boot, Spring MVC, Spring Data JPA, Spring Session |
| Database   | H2 (file-based, embedded — no external DB server needed)        |
| Frontend   | React 18, Vite                                                  |
| Messaging  | Twilio WhatsApp API                                              |
| Auth       | Google Sign-In (One Tap / ID token verification)                 |
| Deployment | Docker (any container host — Render, Railway, Fly.io, etc.)     |

## Architecture

```
WhatsApp ──▶ Twilio ──▶ /whatsapp webhook ──┐
                                             ├──▶ Spring Boot app ──▶ H2 file DB
Browser ──▶ React PWA ──▶ /api/* ───────────┘         │
                                                        └──▶ voucher provider APIs (balance refresh)
```

The backend serves the compiled React app as static resources and exposes a JSON API under `/api/*`, plus a WhatsApp webhook at `/whatsapp`. Auth is session-cookie based; `AuthInterceptor` guards every `/api/*` route except `/api/auth/*` and `/api/config`.

## Prerequisites

- JDK 21
- Node.js 20+ (for building the frontend)
- A Twilio account with WhatsApp sending enabled (for the bot)
- A Google Cloud OAuth 2.0 Client ID (for web login)

## Environment variables

The app is entirely configured via environment variables — **nothing sensitive is hardcoded**. Copy these into your shell, an `.env` file loaded by your process manager, or your host's environment settings:

| Variable                  | Required | Default    | Description                                                                 |
|----------------------------|:--------:|------------|-------------------------------------------------------------------------------|
| `GOOGLE_CLIENT_ID`          | Yes      | *(empty)*  | OAuth Client ID from [Google Cloud Console](https://console.cloud.google.com/apis/credentials), used for Google Sign-In. |
| `ALLOWED_EMAILS`            | No       | *(empty = anyone can log in)* | Comma-separated list of emails allowed to log in to the web app. |
| `VOUCHER_EMAILS`            | No       | *(empty = everyone can see vouchers)* | Comma-separated list of emails allowed to see the Vouchers tab. |
| `TWILIO_ACCOUNT_SID`        | Yes*     | —          | Twilio Account SID (`*` only required if you use the WhatsApp bot). |
| `TWILIO_AUTH_TOKEN`         | Yes*     | —          | Twilio Auth Token. |
| `TWILIO_WHATSAPP_FROM`      | Yes*     | —          | Your Twilio WhatsApp sender number, e.g. `+14155238886`. |
| `NOTIFICATION_RECIPIENT`    | Yes*     | —          | Comma-separated WhatsApp number(s) that receive voucher-expiry reminders. |
| `DB_USERNAME`               | No       | `sa`       | H2 database username. |
| `DB_PASSWORD`               | No       | `password` | H2 database password — override this for anything beyond local dev. |
| `H2_CONSOLE_ENABLED`        | No       | `false`    | Enable the `/h2-console` DB admin UI. Leave `false` in any public/production deployment. |
| `H2_CONSOLE_ALLOW_OTHERS`   | No       | `false`    | Allow the H2 console to be reached from outside localhost. Never enable this in production. |

The app boots and the web UI works without the Twilio variables set — the WhatsApp bot and expiry-reminder job just won't be able to send messages until they're configured.

## Running locally

1. **Backend**

   ```bash
   export GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   # optionally: ALLOWED_EMAILS, TWILIO_*, NOTIFICATION_RECIPIENT, etc.
   ./gradlew bootRun
   ```

   The API and (once built, see below) the web app are served at `http://localhost:8080`.

2. **Frontend (dev mode with hot reload)**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   This runs Vite on `http://localhost:5173` and proxies `/api/*` requests to the backend on port 8080 (see `frontend/vite.config.js`), so run the backend alongside it.

3. **Building the frontend for the backend to serve**

   ```bash
   cd frontend
   npm run build
   ```

   This outputs into `src/main/resources/static`, which Spring Boot serves directly — so a single `bootRun`/jar serves both the API and the UI in production.

The H2 database is a local file created automatically at `data/shopping_db.mv.db` on first run — no external database to set up. This path is gitignored; each environment gets its own local/persistent volume.

## Setting up Google Sign-In

1. Create an OAuth 2.0 Client ID (Web application) in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Add your local (`http://localhost:8080`) and deployed origins to **Authorized JavaScript origins**.
3. Set `GOOGLE_CLIENT_ID` to that client ID. The frontend fetches it at runtime from `/api/config` — no rebuild needed when it changes.

## Setting up the WhatsApp bot

1. Create a [Twilio](https://www.twilio.com/) account and enable the WhatsApp Sandbox (or a production WhatsApp sender).
2. Point the Twilio WhatsApp webhook (Sandbox settings, or your sender's config) at `https://<your-deployed-host>/whatsapp`.
3. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, and `NOTIFICATION_RECIPIENT`.

## Deployment

The included `Dockerfile` builds the frontend and backend together into a single runnable jar/image — deployable to any container host (Render, Railway, Fly.io, a VPS, etc.):

```bash
docker build -t shopping-bot .
docker run -p 8080:8080 \
  -e GOOGLE_CLIENT_ID=... \
  -e TWILIO_ACCOUNT_SID=... \
  -e TWILIO_AUTH_TOKEN=... \
  -e TWILIO_WHATSAPP_FROM=... \
  -e NOTIFICATION_RECIPIENT=... \
  -v shopping-bot-data:/data \
  shopping-bot
```

Mount a persistent volume at the working directory's `data/` path (where the container runs `app.jar`) so the H2 database survives restarts/redeploys. `GET /health` is available for host health checks.

**Security note:** keep `H2_CONSOLE_ENABLED` and `H2_CONSOLE_ALLOW_OTHERS` unset (or `false`) on any publicly reachable deployment — enabling either exposes a database admin console over HTTP.

## License

MIT — see [LICENSE](LICENSE). Fork it, adapt it for your own household, and make it your own.
