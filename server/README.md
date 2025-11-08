# CyberX Content Server

This folder contains the Node.js + SQLite backend that turns the static CyberX site into a manageable, dynamic experience.

## Quick start

1. Create a `.env` file based on `.env.example` and tweak the values as needed.
2. Install dependencies:
   ```powershell
   cd server
   npm install
   ```
3. Start the API + static web server:
   ```powershell
   npm run dev
   ```
   or in production:
   ```powershell
   npm start
   ```

The server:
- Serves the existing static site files.
- Exposes public read-only APIs under `/api/*` for projects, articles, and lectures.
- Provides authenticated CMS endpoints under `/api/admin/*`.
- Initializes the SQLite database at `server/data/cyberx.db` and seeds a default admin user (change the password right away!).

## Admin panel

Open `http://localhost:3001/admin/` (replace the port if you changed it) to reach the lightweight dashboard. From there you can:
- Publish, edit, or delete projects, articles, and lectures.
- Toggle published status and keep drafts.
- Upload links to detail pages, media, and lecture resources.

## API overview

- `GET /api/projects` – list published projects (append `?includeDrafts=true` for everything).
- `GET /api/articles`
- `GET /api/lectures`
- `POST /api/admin/auth/login` – authenticate and start a session.
- CRUD operations for `/api/admin/projects`, `/api/admin/articles`, `/api/admin/lectures` (all session-protected).

Refer to the route files in `src/routes/` for full request/response details.

## Database schema

The SQLite database keeps four tables: `users`, `projects`, `articles`, and `lectures`. Each content table tracks publication status, timestamps, and author metadata. Columns can be extended easily through `src/db/init.js`.

## Development tips

- Nodemon is configured for rapid iteration via `npm run dev`.
- The server logs the resolved static root when it boots to confirm which files it serves.
- You can inspect the generated database using any SQLite client pointed at `data/cyberx.db`.

Enjoy managing the site without touching the HTML every time!
