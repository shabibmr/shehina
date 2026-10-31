# Execution Checklist: Shehnat UAE Multi-User Shared-State Demo App

- [x] **Task 1: UAE Persona & Corridors Update (Zero Kerala references)**
  - [x] Replace `kerala` with `barakah` ("Al Barakah General Trading LLC", Dubai, UAE) in `MockUI/v4/seed.js`
  - [x] Update seed listings to UAE maritime trade corridors (Dubai/Jebel Ali $\to$ Rotterdam, Hamburg, Dammam, etc.)
  - [x] Update any references in `MockUI/v4/ui.js` from `kerala` to `barakah`
  - [x] Verify domain self-check and seed ledger balance in Node (`diff === 0`)

- [x] **Task 2: Complete Removal of Prototype Bar & Mock Dropdowns**
  - [x] Remove `<header id="proto">` and `#inspector` from `MockUI/v4/index.html`
  - [x] Remove `.proto` CSS rules and `body.frame` phone-border simulation from `MockUI/v4/proto.css`
  - [x] Remove `paintProto()`, scenario `jump()`, and proto DOM handlers from `MockUI/v4/ui.js`
  - [x] Enable clean responsive layout across mobile, tablet, and desktop

- [x] **Task 3: UAE 1-Tap Demo Logins on Sign-In Screen**
  - [x] Redesign `P3` (Sign In) in `MockUI/v4/screens-public.js` with instant 1-tap login chips for all roles:
    - Investor: Aisha Rahman (UAE, KYC Approved), Ben Carter, Dina Haddad
    - Manager: Al Barakah General Trading LLC (Dubai, UAE), Mateo Rojas
    - Shareholder: Layla Nasser (Abu Dhabi, UAE), Omar Al-Said (Oman)
    - Staff: Priya Nair (Reviewer), Sam Okafor (Ops), Fatima Zaid (Finance), Hadi Karim (Owner)
  - [x] Add clean Sign Out handler returning to `/p/signin`

- [x] **Task 4: Zero-Dependency Backend Server & SQLite State Store**
  - [x] Create `state_store.js` using `node:sqlite` for atomic persistence (`./data/shehnat_shared.db`)
  - [x] Create `server.js` using `node:http`, `node:crypto`, `node:fs`, `node:path`
  - [x] Implement endpoints: `GET /api/state`, `POST /api/dispatch`, `GET /api/events` (SSE), `POST /api/auth/login`, `POST /dev/clock`, `POST /dev/reset`
  - [x] Serve Paper-Column tokens, brand assets, and `MockUI/v4` static files

- [x] **Task 5: Frontend Store Adapter with Real-Time Server Sync**
  - [x] Update `MockUI/v4/store.js` to dispatch actions to `POST /api/dispatch`
  - [x] Implement `EventSource('/api/events')` listener for instant cross-device updates
  - [x] Use `sessionStorage` for active user session so different browser tabs/windows can log in as different personas simultaneously

- [x] **Task 6: Verification & Automated Tests**
  - [x] Run domain self-check and verify BR §6.4 & §11.4 worked examples
  - [x] Run seed ledger verification (`L.verify().ok`)
  - [x] Execute automated multi-user concurrent dispatch test (`test_shared_dispatch.js`)
  - [x] Verify server starts cleanly on `http://localhost:8080`

- [x] **Task 7: Material 3 UI Integration for Variant E Theme**
  - [x] Define M3 tokens (8dp spacing, shape scale, dual-layer emerald-tinted elevation shadows, emphasized motion curves)
  - [x] Expand spatial margins, internal card padding (20px–24px), section vertical rhythm (24px–32px), and bottom clearance
  - [x] Apply M3 elevation shadows and interactive hover lifts to cards, buttons, and navigation bar
  - [x] Implement M3 motion curves & keyframe animations for screen transitions (`.is-fade`), bottom sheets (`#sheet`), scrim, and toast
  - [x] Verify visual harmony, responsiveness, and regression test suite

- [x] **Task 8: Clean Rebuild and Run**
  - [x] Terminate existing daemon task (task-272)
  - [x] Reset SQLite database `./data/shehnat_shared.db` to fresh canonical UAE seed
  - [x] Run automated multi-user test suite (`test_shared_dispatch.js`)
  - [x] Launch fresh background server daemon on port 8080 (task-418)
  - [x] Verify server health and Material 3 asset delivery

- [ ] **Task 9: Standardized Material 3 Component Gaps**
  - [ ] Set `.column` to `display: flex; flex-direction: column; gap: var(--m3-space-5)` (20px)
  - [ ] Style `.row` as distinct elevated glass cards with 12px gaps (`margin-block-end: 12px`) and 16px internal padding
  - [ ] Add explicit `form { display: flex; flex-direction: column; gap: 16px; margin-block-end: 24px; }`
  - [ ] Style button groups and action pairs with 12px gaps
  - [ ] Map legacy `--space-*` tokens to `--m3-space-*` at `:root`
  - [ ] Verify visual spacing and automated test suite pass
