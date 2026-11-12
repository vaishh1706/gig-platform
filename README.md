# Cooperative Gig Services Platform (SIH26089)

A digital platform that connects skilled workers (electricians, plumbers, carpenters and more) with households that need their services, and lets workers share jobs through a cooperative network.

## Features

- **All-skill marketplace**: customers post jobs and browse workers in any trade.
- **Smart worker matching**: workers are scored out of 100 on trade (40), skills (30), location (20) and rate vs. budget (10).
- **Cooperative job sharing**: a worker who cannot finish an assigned job shares it to the co-op pool, and another worker claims it.
- Role-based accounts (customer / worker) with JWT login.

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | JavaScript, HTML, CSS |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB (Mongoose) |

## Run locally

Requirements: Node.js 18+ and a MongoDB instance (local or MongoDB Atlas).

```bash
cd backend
npm install
cp .env.example .env      # then edit MONGO_URI and JWT_SECRET
npm run seed              # optional demo data (password: password123)
npm run dev
```

Open http://localhost:5000. The backend serves the frontend.

Demo logins after seeding: `customer@example.com` and `ravi@example.com`.

## API overview

| Method | Route | Who | What |
|--------|-------|-----|------|
| POST | /api/auth/register, /api/auth/login | anyone | Create account / log in |
| GET | /api/workers/match | anyone | Ranked worker matches |
| POST | /api/jobs | customer | Post a job |
| GET | /api/jobs | logged in | Open jobs board |
| GET | /api/jobs/mine | logged in | My jobs |
| POST | /api/jobs/:id/apply | worker | Apply to a job |
| POST | /api/jobs/:id/assign | customer | Pick an applicant |
| POST | /api/jobs/:id/share | worker | Share an assigned job with the co-op |
| GET | /api/jobs/shared | worker | Co-op pool |
| POST | /api/jobs/:id/claim | worker | Claim a shared job |
| POST | /api/jobs/:id/complete | customer | Mark a job complete |

## Team

- Achyuth: frontend development
- Rajesh: frontend correction
- Pravalika: adding features
- Vyshnavi: backend connection

## Status

Frontend and database connection complete. Remaining: model evaluation, testing, final deployment.
