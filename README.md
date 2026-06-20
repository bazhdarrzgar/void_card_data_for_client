# Voide Form — Local Dataset Studio

Voide Form is a premium, developer-focused full-stack web application designed for loading, viewing, searching, editing, and exporting tabular datasets. It automatically converts upload files (`.csv` or `.xlsx`) into dynamically generated SQLite database tables on the backend, enabling structured and fast client-server operations.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Vue 3 (Composition API)
- **Build Tool:** Vite (fast ESM development server)
- **Styling:** Tailwind CSS (with bespoke glassmorphism & dark mode tokens)
- **Spreadsheet Parsing/Exporting:** `SheetJS` (`xlsx`)
- **Fuzzy Search:** `Fuse.js` (for highly flexible, client-side dynamic search)

### Backend
- **Runtime:** Node.js with Express
- **Database:** `better-sqlite3` (synchronous, native, high-performance SQLite engine)

---

## 🚀 Features

1. **Dynamic Schema Imports:** Upload any CSV or Excel file. The backend automatically parses the columns, drops the old table if one exists, creates a fresh database schema matching the uploaded headers, and populates the records.
2. **Interactive Cell Manipulation:** Selecting any row in the **Table Preview** loads it instantly into the **Data Manipulation Section** as isolated cells matching the database columns. From here, you can directly update the cells or delete the entire row.
3. **Fuzzy Search:** Filter rows instantly as you type using Fuzzy Search logic. Match rates are computed dynamically over all database columns.
4. **Fast Exports:** Export the currently filtered set of records back into a standard `.xlsx` spreadsheet at any point with a single click.
5. **Modern Aesthetics:** Tailored custom dark mode with glassmorphic cards, fluid transitions, and glowing element highlights.

---

## 📂 Project Structure

```
voide_form/
├── client/                 # Vue 3 Frontend
│   ├── src/
│   │   ├── components/     # UI Components (ActionBar, Form, Search, Table, Toast)
│   │   ├── composables/    # API request wrapper (`useApi.js`)
│   │   ├── App.vue         # Root orchestration component
│   │   ├── main.js         # Entry point
│   │   └── style.css       # Tailwind & custom CSS styles
│   ├── index.html          # Shell layout & Google Font loaders
│   ├── vite.config.js      # Dev server configuration & proxy settings
│   └── package.json
├── server/                 # Node.js Express Backend
│   ├── data.db             # Local SQLite database (auto-generated)
│   ├── database.js         # SQLite schema & CRUD methods via better-sqlite3
│   ├── index.js            # Express API endpoints
│   └── package.json
├── run_dev.sh              # Unified development runner script
└── README.md               # Project documentation
```

---

## ⚡ How to Run

You can run both servers simultaneously using the provided automated runner script.

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### Dev Mode Execution

1. Make the runner script executable (only needed once):
   ```bash
   chmod +x run_dev.sh
   ```

2. Start development mode:
   ```bash
   ./run_dev.sh
   ```

The script will:
* Check for and install missing `node_modules` dependencies in both folders automatically.
* Start the Node.js Express API server on `http://localhost:3001`.
* Start the Vite Vue client server (typically on `http://localhost:5173` or `http://localhost:5174`).
* Allow stopping both servers gracefully at any time via `Ctrl+C`.

### Production Build & Launch

To build the static frontend code and run the application as a unified production server:

1. Make the production build script executable:
   ```bash
   chmod +x run_build.sh
   ```

2. Build the project and start:
   ```bash
   ./run_build.sh
   ```

The script will:
* Compile all Vue 3 / CSS static resources into production assets inside `client/dist/`.
* Launch the unified Node.js Express server on `http://localhost:3001`.
* Serve the API endpoints alongside the single-page application at the single URL: `http://localhost:3001`.

### Stopping the Project

If you have processes running in the background, or need to clean up ports 3000, 3001, 5173, or 5174:

1. Make the stop script executable:
   ```bash
   chmod +x stop.sh
   ```

2. Run the stop script:
   ```bash
   ./stop.sh
   ```

This terminates any active processes listening on the designated development or production ports and kills remaining workspace node servers.

