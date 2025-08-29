# SV-CheckIn

SV-CheckIn is a TypeScript Node.js application for managing and tracking activities and attendance of student representatives. It should be understood as a helpful tool for student representatives to keep
track of their own activities and staying organized.

## Features

- User authentication and login
- Dashboard for check-in and activity tracking
- Notes and notifications via Rocket.Chat webhook
- Responsive UI with EJS templates
- SQLite database via Drizzle ORM

## Planned Features

(maybe, if I'll have enough time)

- [ ] Adding and editing checkin-types
- [ ] Browsing tracked activities
  - [ ] adding durations,
  - [ ] editing notes
- [ ] Migrating to PostgreSQL

## Project Structure

- `src/` - Application source code
  - `index.ts` - Main server entry point
  - `dashboard.ts` - Dashboard logic
  - `login.ts` - Login logic
  - `db/` - Database schema and connection
  - `utils/` - Utility functions
- `views/` - EJS templates
- `public/` - Static assets (CSS, images, HTML)
- `database.sqlite` - SQLite database file
- `drizzle.config.ts` - Drizzle ORM configuration

## Setup

1. Install dependencies:
   ```sh
   pnpm install
   ```
2. Build the project:
   ```sh
   pnpm run build
   ```
3. Run the server:
   ```sh
   pnpm start
   ```

## Usage

- Visit the homepage to log in.
- After login, access the dashboard to check in and add notes.
- Notifications are sent via Rocket.Chat if configured.

## Configuration

- Set environment variables in `.env`:
  - `ROCKET_WEBHOOK_URI` for Rocket.Chat integration

## License

MIT License

---

## Documentation

### Authentication

Users log in via the `/login` route. Credentials are checked against the database.

### Dashboard

After logging in, users access `/dashboard` to check in to activities. Notes can be added and notifications sent.

### Database

Drizzle ORM manages the SQLite database. Schema is defined in [`src/db/schema.ts`](src/db/schema.ts).

### Notifications

When a user checks in, a message is sent to Rocket.Chat using the webhook URI specified in `.env`.

### Static Assets

CSS and images are served from the [`public/`](public/) directory.

### Templating

EJS templates are located in [`views/`](views/), rendering dynamic content for the dashboard and other pages.

For more details, see the source files:
- [`src/index.ts`](src/index.ts)
-