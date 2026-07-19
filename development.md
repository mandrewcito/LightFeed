# Development Guide

## Architecture

LightFeed is a local-first RSS reader. Tauri v2 provides the shell; React renders the UI; Rust handles everything else.

```
┌─────────────────────────────────────────────────┐
│  Frontend (React 19 + Vite + Tailwind CSS 4)    │
│  Zustand stores → ipc-client.ts → invoke()      │
└──────────────────────┬──────────────────────────┘
                       │  Tauri IPC (JSON over serde)
┌──────────────────────▼──────────────────────────┐
│  Rust Backend (src-tauri/src/)                   │
│                                                  │
│  commands.rs   — 30+ #[tauri::command] handlers  │
│  db/            — rusqlite, schema, CRUD ops      │
│  services/      — feed-rs, dom_smoothie, OPML    │
└──────────────────────┬──────────────────────────┘
                       │
              SQLite (WAL mode)
         Single file: lightfeed.db
```

### Data flow

1. User action triggers a React component
2. Component calls a Zustand store action
3. Store action calls `invoke('command_name', { args })` via `src/renderer/lib/ipc-client.ts`
4. Tauri routes to the matching `#[tauri::command]` in `src-tauri/src/commands.rs`
5. Command acquires `Mutex<Connection>` from app state, runs SQL via rusqlite
6. Result serializes back through Tauri IPC to the frontend

### Rust backend (`src-tauri/src/`)

| Module | Purpose |
|--------|---------|
| `lib.rs` | App setup, state initialization, scheduler startup |
| `commands.rs` | All Tauri command handlers (feed CRUD, entries, settings, etc.) |
| `db/mod.rs` | Database init, schema migrations, `entry_id()` hash |
| `db/models.rs` | Serde structs: `Feed`, `Entry`, `Category`, `Subscription`, `EntryFilter` |
| `db/feed.rs` | Feed upsert, update, delete |
| `db/category.rs` | Category CRUD + reorder |
| `db/subscription.rs` | Subscription CRUD + drag-and-drop reorder |
| `db/entry.rs` | Entry list/get, mark read, toggle star, paginated queries |
| `db/settings.rs` | Key-value settings store, OPML export data |
| `services/feed_service.rs` | HTTP fetch + feed-rs parsing + dom_smoothie readability extraction |
| `services/opml.rs` | OPML XML builder + URL parser |
| `services/cleanup.rs` | Scheduled deletion of old non-starred entries |

### Frontend (`src/renderer/`)

| Directory | Contents |
|-----------|----------|
| `stores/` | Zustand state: `app-store` (theme, dialogs), `feed-store` (feeds, categories), `article-store` (entries, pagination) |
| `components/layout/` | Main 3-panel layout, sidebar, toolbar |
| `components/feed/` | Feed tree, feed items, add-feed dialog |
| `components/article/` | Article list, article cards, article reader |
| `components/settings/` | Settings dialog: general, storage, import/export, about |
| `components/ui/` | Shared UI primitives (confirm dialog) |
| `hooks/` | `use-keyboard` — keyboard shortcuts |
| `lib/ipc-client.ts` | Typed wrapper around Tauri `invoke()` (replaces Electron preload bridge) |
| `types.ts` | TypeScript interfaces matching Rust models |

### Key crates

| Crate | Replaces | Role |
|-------|----------|------|
| `rusqlite` | better-sqlite3 | Synchronous SQLite with WAL |
| `feed-rs` | rss-parser | RSS 0.9–2.0, Atom, JSON Feed parsing |
| `dom_smoothie` | @mozilla/readability | Article content extraction (Mozilla Readability port) |
| `reqwest` | node fetch | HTTP client with gzip, timeouts |
| `scraper` | jsdom | HTML parsing for thumbnail extraction |
| `tauri-plugin-updater` | electron-updater | Native auto-update flow |
| `tauri-plugin-shell` | shell.openExternal | Open URLs in default browser |
| `tauri-plugin-dialog` | Electron dialog | File/folder selection dialogs |

### Database schema

5 tables, WAL journal mode, foreign keys with cascade deletes:

```
feeds           — id, url (unique), title, description, site_url, image_url,
                  last_fetched_at, fetch_error, fetch_interval

categories      — id, name, sort_order

subscriptions   — id, feed_id (FK→feeds), category_id (FK→categories, nullable),
                  custom_title, sort_order, created_at

entries         — id (SHA1 of feedId:url:title:publishedAt), feed_id (FK→feeds),
                  title, url, content, readable_content, author,
                  published_at, fetched_at, has_read, starred, thumbnail

settings        — key (PK), value
```

Indexes: `feed_id`, `published_at DESC`, `has_read`, `starred`.

---

## Prerequisites

### Rust

Install via [rustup](https://rustup.rs/):

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Verify:

```bash
rustc --version   # >= 1.77.2
cargo --version
```

### Node.js

Requires Node.js 24+ and npm.

### System dependencies

**Linux (Ubuntu/Debian):**

```bash
sudo apt-get update
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf \
  libgtk-3-dev
```

**macOS:**

```bash
xcode-select --install
```

**Windows:**

Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with "Desktop development with C++" workload. The CI uses `ilammy/msvc-dev-cmd@v1`.

---

## Getting Started

```bash
git clone https://github.com/mandrewcito/rss.mandrewcito.dev.git
cd rss.mandrewcito.dev
npm install
npm run dev
```

`npm run dev` runs two things in parallel:

1. **Vite dev server** on `http://localhost:5173` (frontend hot reload)
2. **Tauri dev** builds the Rust backend and opens the native window

Changes to `src/renderer/` hot-reload. Changes to `src-tauri/src/` trigger a Rust recompile (~5–30s).

---

## Commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Development mode with hot reload |
| `npm run build` | Production build: Vite → `dist/`, then Tauri bundles native installers |
| `npm run build:vite` | Build frontend only (Vite → `dist/`) |
| `npm run dev:vite` | Start Vite dev server only |
| `npm run typecheck` | TypeScript type checking |
| `npm run tauri -- <cmd>` | Pass commands to the Tauri CLI |
| `cargo check` | Rust compilation check (in `src-tauri/`) |

### In `src-tauri/` directly

```bash
cargo check          # Typecheck Rust
cargo build          # Compile Rust
cargo clippy         # Lint
cargo fmt            # Format
```

### Tauri CLI

```bash
npx tauri dev        # Same as npm run dev
npx tauri build      # Production build + bundle
npx tauri icon resources/lf-icon.png   # Generate icon set
npx tauri info       # Show environment info
```

---

## Build & Package

```bash
npm run build
```

Produces platform-specific bundles:

| Platform | Output | Location |
|----------|--------|----------|
| Linux | `.deb` + `.AppImage` | `src-tauri/target/release/bundle/` |
| macOS | `.dmg` + `.app` | `src-tauri/target/release/bundle/macos/` |
| Windows | NSIS installer + portable `.exe` | `src-tauri/target/release/bundle/nsis/` |

### Release process

1. Update version in `package.json` and `src-tauri/Cargo.toml`
2. Commit and push
3. Tag and push:
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```
4. GitHub Actions builds for all 3 platforms and creates a release with assets

Secrets required in GitHub repo settings:

| Secret | Purpose |
|--------|---------|
| `TAURI_SIGNING_PRIVATE_KEY` | Signs updater artifacts |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password for signing key |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j` / `↓` | Next article |
| `k` / `↑` | Previous article |
| `s` | Toggle star |
| `m` | Mark as read |
| `r` | Refresh all feeds |
| `a` | Add feed |
| `Ctrl+A` | Select all feeds |
| `/` | Focus search |
| `b` | Toggle sidebar |
| `Delete` / `Backspace` | Batch delete selected feeds |
| `Escape` | Clear selection / close dialogs |

---

## Project Structure

```
rss.mandrewcito.dev/
├── .github/workflows/release.yml   # CI/CD: build + release on tag push
├── resources/
│   ├── lf-icon.png                  # App icon source
│   └── example.opml                 # Sample OPML file
├── src/                             # Frontend
│   ├── renderer/
│   │   ├── components/              # React components
│   │   ├── hooks/                   # use-keyboard
│   │   ├── lib/ipc-client.ts        # Tauri invoke() wrapper
│   │   ├── stores/                  # Zustand state
│   │   ├── types.ts                 # TypeScript interfaces
│   │   ├── App.tsx                  # Root component
│   │   └── main.tsx                 # React mount
├── src-tauri/                       # Rust backend
│   ├── Cargo.toml                   # Rust dependencies
│   ├── tauri.conf.json              # Tauri config
│   ├── capabilities/default.json    # Security permissions
│   ├── icons/lf-icon.png            # Bundled icon
│   └── src/
│       ├── main.rs                  # Entry point
│       ├── lib.rs                   # App setup + schedulers
│       ├── commands.rs              # Tauri command handlers
│       ├── db/                      # Database layer
│       └── services/                # Feed, readability, OPML, cleanup
├── package.json
├── vite.config.ts                   # Vite config
├── tsconfig.json
├── tsconfig.web.json
├── tsconfig.node.json
├── Makefile                         # Build shortcuts
└── .gitignore
```

---

## Configuration

### `src-tauri/tauri.conf.json`

- `build.devUrl` — Vite dev server URL (default: `http://localhost:5173`)
- `build.beforeDevCommand` — command run before `tauri dev`
- `build.beforeBuildCommand` — command run before `tauri build`
- `app.windows[0].titleBarStyle` — `"Overlay"` for macOS hidden title bar
- `bundle.targets` — which formats to produce
- `plugins.updater.endpoints` — GitHub releases URL for auto-update checks

### `src-tauri/capabilities/default.json`

Controls what the frontend is allowed to do. Current permissions:

- `core:default` — basic Tauri functionality
- `shell:allow-open` — open URLs in browser
- `dialog:allow-*` — file/folder dialogs
- `fs:default` — file system access
- `updater:default` — auto-update checks

---

## Troubleshooting

**`error: no such command: tauri`**

Run `npm install` first. The `tauri` CLI comes from `@tauri-apps/cli` in `node_modules`.

**Linux: `webkit2gtk-4.1 not found`**

Install the dev package: `sudo apt-get install libwebkit2gtk-4.1-dev`

**Rust compile errors after pulling**

Run `cargo check` in `src-tauri/` to see the actual errors. Rust errors are usually more descriptive than the Tauri wrapper output.

**Frontend changes not reflecting**

Make sure Vite dev server is running (`npm run dev:vite` or via `npm run dev`). The Tauri window loads from `http://localhost:5173` in dev mode.

**Database migration**

LightFeed uses `CREATE TABLE IF NOT EXISTS` for schema init and `PRAGMA user_version` for version tracking. The schema is compatible across devices — copy `lightfeed.db` to sync.
