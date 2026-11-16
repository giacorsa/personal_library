# Personal Library

Personal Library is a full-stack application for finding books and organizing a personal reading collection. Create an account, sign in, search Open Library by title or author, and save works to your own library. You can view book details, update reading statuses, and remove books from your collection.

The frontend uses Vue, Vite, and Font Awesome. Vue components switch views within a single page. The backend uses Node.js and Express, and MySQL stores accounts, books, library entries, and sessions. Search results represent Open Library works, so a saved entry refers to a work rather than a specific edition.

## Book data from Open Library

The Express backend uses [Open Library](https://openlibrary.org/) to search for books by title or author and retrieve details about individual works. Open Library was chosen because its public JSON endpoints are easy to use and the read requests used by this project do not require an API key.

- `GET /search.json` returns search results for a title or author. See the [Search API documentation](https://openlibrary.org/dev/docs/api/search).
- `GET /works/{workId}.json` returns details for a specific work, such as `OL1168083W`. See the [Open Library API documentation](https://openlibrary.org/developers/api).

The Vue frontend calls the application's Express API. Express calls Open Library and returns the data the interface needs. Search results represent works, and users' saved books and reading statuses are stored in the application's MySQL database.

## Project structure

```text
personal_library/
├── backend/
│   ├── database/
│   │   └── migrations.sql
│   ├── src/
│   ├── .env.example
│   ├── package.json
│   ├── pnpm-lock.yaml
│   └── pnpm-workspace.yaml
├── frontend/
│   ├── public/
│   ├── src/
│   ├── index.html
│   ├── package.json
│   ├── pnpm-lock.yaml
│   └── vite.config.js
└── README.md
```

## Prerequisites

- Node.js 24 and pnpm
- A running MySQL Server 8.0 instance
- MySQL Workbench 8.0 or the MySQL command-line client
- Internet access for Open Library searches and book covers

MySQL Workbench is a client. Start MySQL Server before running the migration or launching the backend.

## Local setup

### 1. Create the database

Start MySQL Server 8.0.

- The migration script is located at `backend/database/migrations.sql`.
- It creates the `personal_libraries` database and the `users`, `books`, `user_library`, and `sessions` tables.
- Run it using either method below with a MySQL account that can create databases and tables.

#### Option A — MySQL command-line client

1. Open a terminal in the repository root, where the `backend` and `frontend` folders are located.
2. Connect to MySQL. Replace `your_mysql_user` with your MySQL username and enter your password when prompted. Adjust the host or port if your server uses different settings.

   ```powershell
   mysql -h 127.0.0.1 -P 3306 -u your_mysql_user -p
   ```

3. At the `mysql>` prompt, run the migration and verify the tables.

   ```sql
   SOURCE backend/database/migrations.sql;
   USE personal_libraries;
   SHOW TABLES;
   ```

   The output should list `books`, `sessions`, `user_library`, and `users`. See the [MySQL documentation on executing SQL script files](https://dev.mysql.com/doc/refman/8.0/en/mysql-batch-commands.html).

#### Option B — MySQL Workbench 8.0

1. Open MySQL Workbench and connect to your local MySQL Server.
2. In the SQL Editor, choose **File → Open SQL Script** and open `backend/database/migrations.sql`.
3. With no text selected, click the lightning-bolt button labeled **Execute the selected portion of the script or everything, if there is no selection**. Check **Action Output** for errors.
4. Refresh the **Schemas** panel, expand `personal_libraries`, and open **Tables**. Confirm that `books`, `sessions`, `user_library`, and `users` are present. See the [MySQL Workbench SQL Editor toolbar documentation](https://dev.mysql.com/doc/workbench/en/wb-sql-editor-toolbar.html).

After running the migration, keep `DB_NAME=personal_libraries` in `backend/.env`. The MySQL account configured in that file needs `SELECT`, `INSERT`, `UPDATE`, and `DELETE` permissions on the application database.

### 2. Configure and start the backend

From the repository root, run these commands in PowerShell.

```powershell
Set-Location backend
Copy-Item .env.example .env
```

Edit `backend/.env` and supply your own MySQL credentials.

```dotenv
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=personal_libraries
SESSION_SECRET=replace_with_a_random_secret
```

Generate a random value for `SESSION_SECRET` with Node.js and paste the output into `.env`.

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

The backend requires `SESSION_SECRET` to be at least 32 characters long. Keep `backend/.env` private and commit only `.env.example` with placeholder values.

From `backend`, install dependencies and start Express.

```powershell
pnpm install
pnpm start
```

A successful start logs `Database connection established`. Express listens at `http://127.0.0.1:3000` by default.

### 3. Start the frontend

Open a second terminal at the repository root and run:

```powershell
Set-Location frontend
pnpm install
pnpm dev
```

Open the URL printed by Vite, typically `http://localhost:3001`. Keep both terminals running. During development, Vite forwards requests under `/api` to Express at `http://127.0.0.1:3000`. If you change the backend port, update the proxy target in `frontend/vite.config.js` as well.

## Authentication and sessions

Registration stores an Argon2 password hash in MySQL. After a successful sign-in, Express stores the session in the `sessions` table and sends the browser an HTTP-only `pl.sid` cookie containing the session identifier. `SESSION_SECRET` signs that cookie. Vue calls `GET /api/auth/me` to restore the signed-in view after a page reload. Signing out ends the server-side session.

## Verify the setup

1. Create an account and sign in.
2. Search by **Title** or **Author** and save a work to your library.
3. Open **My library**, change the reading status, and refresh the page to check that the new status persists.
4. Remove the work and sign out.

If the backend fails to start, check that MySQL Server is running, the settings in `.env` match your connection, and `migrations.sql` has been executed. If the frontend loads but API requests fail, verify that Express is running and that the Vite proxy points to its port.

## Production build

Run `pnpm build` from `frontend` to generate the frontend assets in `frontend/dist`. A deployed instance also needs a running Express backend and a MySQL database initialized with `backend/database/migrations.sql`. The deployment must route browser requests under `/api` to Express and serve the application over HTTPS so the production session cookie can be sent.

## References

- [MySQL Workbench SQL Editor](https://dev.mysql.com/doc/workbench/en/wb-sql-editor.html)
- [Express session middleware](https://expressjs.com/en/resources/middleware/session.html)
- [Vite development server proxy](https://vite.dev/config/server-options.html#server-proxy)
- [Open Library](https://openlibrary.org/)
