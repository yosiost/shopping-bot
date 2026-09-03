# Shopping Bot 🛒

A family shopping-list and gift-voucher tracker with a WhatsApp bot front end and a web PWA, built with **Kotlin / Spring Boot** on the backend and **React + Vite** on the frontend.

Send "milk" to a WhatsApp number and it lands on a shared list your household can also view and manage from a phone-friendly web app — complete with Google sign-in, per-user aliases, and automatic gift-voucher balance tracking with expiry reminders.

## Features

- **WhatsApp bot** — add/remove items and check the list via WhatsApp messages (powered by Twilio).
- **Web app (PWA)** — a installable, mobile-first React app for the same shared lists, with Google Sign-In.
- **Two lists** — separate "Shopping" and "Home" item lists.
- **Gift voucher tracker** — store voucher numbers/balances and auto-refresh balances. Balance auto-refresh is currently wired to three **Israeli** gift-card providers (BuyMe, KsharimPlus, Praxell); outside Israel this part won't find a match, but manual balance entry still works fine.
- **Expiry reminders** — a daily scheduled job WhatsApps a summary of vouchers expiring within a month.
- **Access control** — restrict login to an allow-list of email addresses; a separate allow-list can gate who sees the voucher tab.
- **Persistent sessions** — sessions are stored in the database so a server restart doesn't log anyone out.

## Tech stack

| Layer      | Tech                                                             |
|------------|-------------------------------------------------------------------|
| Backend    | Kotlin, Spring Boot, Spring MVC, Spring Data JPA, Spring Session |
| Database   | Postgres in production; embedded H2 file DB for local dev       |
| Frontend   | React 18, Vite                                                  |
| Messaging  | Twilio WhatsApp API                                              |
| Auth       | Google Sign-In (One Tap / ID token verification)                 |
| Deployment | Docker (any container host — Render, Railway, Fly.io, etc.)     |

## Architecture

```
WhatsApp ──▶ Twilio ──▶ /whatsapp webhook ──┐
                                             ├──▶ Spring Boot app ──▶ Postgres (prod) / H2 file DB (local)
Browser ──▶ React PWA ──▶ /api/* ───────────┘         │
                                                        └──▶ voucher provider APIs (balance refresh)
```

The backend serves the compiled React app as static resources and exposes a JSON API under `/api/*`, plus a WhatsApp webhook at `/whatsapp`. Auth is session-cookie based; `AuthInterceptor` guards every `/api/*` route except `/api/auth/*` and `/api/config`.

## Quickstart

The bare minimum to see the web app running locally (WhatsApp bot setup is separate, see below):

1. Create a Google OAuth Client ID — [Setting up Google Sign-In](#setting-up-google-sign-in) takes two minutes.
2. `export GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com`
3. `./gradlew bootRun`
4. Open `http://localhost:8080` and sign in.

That's it — Gradle builds the React frontend and starts the backend in one command (see [Running locally](#running-locally)), and the database is a local file with zero setup. Everything else in this README (Twilio, Postgres, allow-lists, deployment) is optional depending on what you need.

## Prerequisites

- JDK 21
- Node.js 20+ (only needed if you run `npm` commands directly — `./gradlew bootRun` installs and builds the frontend for you)
- A Google Cloud OAuth 2.0 Client ID (for web login — required even for local dev)
- A Twilio account with WhatsApp sending enabled (only if you want the WhatsApp bot)
- A Postgres database (only for production/deployment — local dev falls back to an embedded H2 file DB). [Neon](https://neon.tech) has a free tier that works well for this.

## Setting up Google Sign-In

Required even for local dev — the web app has no login without it.

1. Create an OAuth 2.0 Client ID (Web application) in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Add your local (`http://localhost:8080`) and deployed origins to **Authorized JavaScript origins**.
3. Set `GOOGLE_CLIENT_ID` to that client ID. The frontend fetches it at runtime from `/api/config` — no rebuild needed when it changes.

## Setting up the WhatsApp bot

Optional — the web app works without this.

1. Create a [Twilio](https://www.twilio.com/) account and enable the WhatsApp Sandbox (or a production WhatsApp sender).
2. Point the Twilio WhatsApp webhook (Sandbox settings, or your sender's config) at `https://<your-deployed-host>/whatsapp`.
3. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, and `NOTIFICATION_RECIPIENT`.

**Testing this locally:** Twilio's webhook needs to reach your machine over the public internet — `localhost:8080` won't work. Use a tunnel like [ngrok](https://ngrok.com/) (`ngrok http 8080`) and point the Twilio webhook at the `https://*.ngrok-free.app/whatsapp` URL it gives you while you're testing. For everyday use, point Twilio at your real deployment instead.

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
| `SPRING_DATASOURCE_URL`     | No       | *(unset = use local H2 file)* | JDBC URL of your production Postgres instance, e.g. `jdbc:postgresql://<host>/<db>?sslmode=require`. Set this (and the two below) to use Postgres instead of H2. |
| `SPRING_DATASOURCE_USERNAME`| No**     | —          | Postgres username (`**` required only if `SPRING_DATASOURCE_URL` is set). |
| `SPRING_DATASOURCE_PASSWORD`| No**     | —          | Postgres password (`**` required only if `SPRING_DATASOURCE_URL` is set). |
| `DB_USERNAME`               | No       | `sa`       | Username for the local H2 fallback DB — irrelevant once `SPRING_DATASOURCE_*` is set. |
| `DB_PASSWORD`               | No       | `password` | Password for the local H2 fallback DB — irrelevant once `SPRING_DATASOURCE_*` is set. |
| `H2_CONSOLE_ENABLED`        | No       | `false`    | Enable the `/h2-console` DB admin UI. Leave `false` in any public/production deployment. |
| `H2_CONSOLE_ALLOW_OTHERS`   | No       | `false`    | Allow the H2 console to be reached from outside localhost. Never enable this in production. |

The app boots and the web UI works without the Twilio variables set — the WhatsApp bot and expiry-reminder job just won't be able to send messages until they're configured.

## Running locally

```bash
export GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
# optionally: ALLOWED_EMAILS, TWILIO_*, NOTIFICATION_RECIPIENT, etc.
./gradlew bootRun
```

That single command installs frontend dependencies, builds the React app into `src/main/resources/static`, and starts the backend — Gradle's `processResources` task depends on a `buildFrontend` task that runs `npm install` + `vite build` for you (see `build.gradle.kts`). The app is served at `http://localhost:8080`; there's nothing else to build or wire up manually.

**Optional: frontend hot-reload for UI work.** If you're iterating on the React app itself, run a separate dev server instead of rebuilding via Gradle on every change:

```bash
cd frontend
npm install
npm run dev
```

This runs Vite on `http://localhost:5173` and proxies `/api/*` requests to the backend, so keep a `./gradlew bootRun` running on port 8080 alongside it.

## Database: H2 locally, Postgres in production

`application.properties` defaults to a zero-config, file-based **H2** database (`data/shopping_db.mv.db`) — this is what runs when you `bootRun` locally with no extra setup, and it's gitignored so nothing local ever gets committed again.

For a real deployment, point `SPRING_DATASOURCE_URL` (plus `SPRING_DATASOURCE_USERNAME`/`SPRING_DATASOURCE_PASSWORD`) at a Postgres instance — these are standard Spring Boot environment variables and take priority over the H2 settings in `application.properties` automatically, no code changes needed. The `org.postgresql:postgresql` driver is already a dependency. This is how the original deployment runs, using a free [Neon](https://neon.tech) Postgres instance on Render.

## Deployment

The included `Dockerfile` builds the frontend and backend together into a single runnable jar/image — deployable to any container host (Render, Railway, Fly.io, a VPS, etc.). This is how the original instance runs: as a Render web service backed by a free [Neon](https://neon.tech) Postgres database.

Most container hosts (including Render's free/standard tiers) run on an **ephemeral filesystem** — anything written to disk, including an H2 file DB, is wiped on every redeploy or restart. That's why production should point at Postgres via `SPRING_DATASOURCE_URL`/`_USERNAME`/`_PASSWORD` rather than relying on the local H2 file:

```bash
docker build -t shopping-bot .
docker run -p 8080:8080 \
  -e GOOGLE_CLIENT_ID=... \
  -e TWILIO_ACCOUNT_SID=... \
  -e TWILIO_AUTH_TOKEN=... \
  -e TWILIO_WHATSAPP_FROM=... \
  -e NOTIFICATION_RECIPIENT=... \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://<host>/<db>?sslmode=require \
  -e SPRING_DATASOURCE_USERNAME=... \
  -e SPRING_DATASOURCE_PASSWORD=... \
  shopping-bot
```

(If you'd rather run H2 in production anyway — e.g. on a host with a real persistent disk — mount a volume at the working directory's `data/` path instead of setting the `SPRING_DATASOURCE_*` variables.)

`GET /health` is available for host health checks.

**Security note:** keep `H2_CONSOLE_ENABLED` and `H2_CONSOLE_ALLOW_OTHERS` unset (or `false`) on any publicly reachable deployment — enabling either exposes a database admin console over HTTP.

## License

MIT — see [LICENSE](LICENSE). Fork it, adapt it for your own household, and make it your own.
