# sv-checkin

A TypeScript Node.js application using Express, Drizzle ORM (SQLite), and EJS templating.

## Setup

1. Install dependencies:
   ```powershell
   npm install
   ```
2. Build the project:
   ```powershell
   npx tsc
   ```
3. Run the server:
   ```powershell
   npx ts-node src/index.ts
   ```

## Project Structure
- `src/index.ts`: Main server file
- `src/views/`: EJS templates
- `database.sqlite`: SQLite database (created at runtime)

## Features
- Express server
- EJS templating
- Drizzle ORM with SQLite
