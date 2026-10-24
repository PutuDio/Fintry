# Fintry Development Progress

## Current Status

Milestone: **MVP selesai + pre-deployment polish + profile menu** (stages 1-24). Pengguna dapat registrasi, login (dengan forgot password flow), kelola aset (termasuk CASH/tunai), catat transaksi bahasa alami lewat chat (dengan panduan format), lihat riwayat lengkap dengan filter dan pagination, edit/void transaksi dengan audit trail, serta reverse koreksi finansial via VOID + replacement. Input nominal auto-format dengan separator ribuan. Profile menu dengan change password/email. Security audit selesai (posture solid untuk development). E2E Playwright coverage (7 spec) + polish UI (metadata, error boundary, 404, loading, accessibility).

Tests: **70 unit/integration** (domain 19 + repositories 13 + commands 13 + services 8 + parser 10 + chat 7) + **7 E2E** (auth 5 + dashboard-flow 1 + history 1).

Current focus: siap deploy ke production.

Last updated: 2026-10-24

## Completed

### Product and Domain Specification

-   [x] Initial product concept documented in `README.md`
-   [x] Initial PRD reviewed
-   [x] PRD v1.1 system specification prepared (file: `PRD.md`)
-   [x] Financial domain rules defined
-   [x] Project scope and out-of-scope boundaries defined
-   [x] Core financial safety boundary established:
    `AI interprets → Application validates → Domain calculates → Database persists`

### Architecture

-   [x] Technical stack finalized: Next.js, TypeScript, App Router,
    Tailwind CSS, shadcn/ui, Zod, PostgreSQL, Drizzle ORM, Vitest,
    fast-check, Playwright
-   [x] Layered architecture finalized:
    `Presentation → Application → Domain → Infrastructure`
-   [x] Provider-agnostic AI boundary finalized
-   [x] AI is an infrastructure adapter, not a domain dependency
-   [x] Money representation finalized as BIGINT for IDR MVP
-   [x] PostgreSQL transaction + row locking strategy finalized
-   [x] Idempotency strategy finalized
-   [x] User isolation strategy finalized
-   [x] Reversal strategy finalized as VOID, not delete
-   [x] ADR-001 established for core architecture and provider-agnostic
    AI boundary
-   [x] ADR-002 (persistence model and database connection) accepted
-   [x] ADR-003 (authentication) accepted

### Decisions D1--D11 (all FINAL)

-   [x] D1 --- Negative balance is rejected for MVP
-   [x] D2 --- Direct edit only for `description`, `category_id`,
    `transaction_date` (audit `TRANSACTION_UPDATED`); changes to `type`,
    `amount`, `source_asset_id`, `destination_asset_id` are VOID +
    replacement in one DB transaction (`replaces_transaction_id`);
    `VOIDED` transactions are not edited
-   [x] D3 --- `asset_adjustments` is append-only; no void/delete/update
    in the MVP; corrections use a new adjustment
-   [x] D4 --- Assets with non-zero balance cannot be deactivated;
    inactive assets cannot be used for new transactions; voids touching
    inactive assets are rejected; no reactivation in MVP
-   [x] D5 --- Per-user category find-or-create: NFKC + trim + collapse
    whitespace, case-insensitive matching, 1--40 characters, Unicode
    letters/marks/numbers/space/`&`/`-`/`/`, at least one letter, no
    fuzzy/synonym matching, same validator for AI categories, invalid
    category stored as `category_id = NULL`, INCOME/EXPENSE only;
    automatic creation via chat is P0, category management is P1
-   [x] D6 --- At most one `PENDING` intent per user, 10-minute TTL,
    deterministic routing by application code (not the LLM); a new
    financial intent supersedes the old pending; a message without a
    financial intent leaves it pending; system errors keep it `PENDING`;
    final states are never reopened
-   [x] D7 --- Separate `idempotency_keys` table
-   [x] D8 --- Database-level append-only triggers deferred from the MVP
    (repository discipline + tests)
-   [x] D9 --- RLS deferred from the MVP (authenticated `userId`,
    repository scoping, composite FKs, isolation tests)
-   [x] D10 --- `ON DELETE RESTRICT` for domain/financial tables;
    account deletion/purge deferred; auth session/account tables may
    cascade
-   [x] D11 --- Better Auth final: email/password, database sessions,
    UUID user IDs, code only in `infrastructure/auth`, non-MVP features
    disabled, Drizzle Kit as the only migration tool, exact version pin

### Database / Persistence Direction

-   [x] Proposed ERD and persistence model reviewed
-   [x] Composite ownership/FK strategy approved
-   [x] Transaction locking order and atomic mutation flow approved
-   [x] Net worth will be calculated from authoritative asset state
    rather than stored as independent derived financial state
-   [x] Transaction correction/replacement model approved
-   [x] Investment purchase represented as asset-to-asset transfer
-   [x] Investment valuation separated from cashflow transactions

### Authentication

-   [x] Better Auth selected (final)
-   [x] Email/password MVP selected
-   [x] Database sessions selected
-   [x] Drizzle adapter selected
-   [x] UUID user identity required
-   [x] UUID gate defined for `users.id`, `sessions.user_id`, and
    `accounts.user_id`
-   [x] Auth remains isolated in `infrastructure/auth`
-   [x] Domain/application layers use `userId`, not
    auth-provider-specific objects

### PostgreSQL Driver

-   [x] `pg` / node-postgres selected (final)
-   [x] `drizzle-orm/node-postgres` selected
-   [x] One database pool in infrastructure/db approved
-   [x] Direct database URL strategy for migrations approved
-   [x] `neon-http` excluded for financial mutations

### Documentation

-   [x] `domain_rules.md`, `PRD.md`, `tech_stack.md`, `AGENTS.md`,
    `rules.md`, and `project_overview.md` reflect the final decisions
    (checked 2026-10-09)
-   [x] ADR-002 and ADR-003 audited: complete and consistent with the
    final decisions
-   [x] Documentation conflicts resolved and recorded (see Resolved
    Documentation Conflicts)
-   [x] `PRD_v1.1.md` stale references confirmed removed; canonical
    file is `docs/PRD.md` (verified by search 2026-10-21)

### Project Foundation Verification

Baseline recorded 2026-10-08, before the `postgres` → `pg` change:

-   [x] `pnpm approve-builds` --- no pending package build approvals
-   [x] `pnpm install` --- successful / up to date
-   [x] `pnpm lint` --- passed
-   [x] `pnpm build` --- passed
-   [x] Next.js production build completed successfully

### Foundation, Auth Wiring, and Stage 5b (2026-10-21)

-   [x] `postgres` → `pg` applied in the repository: `pg` ^8.23.1 and
    `@types/pg` in `package.json`; `postgres` removed
-   [x] One database pool in `src/infrastructure/db/client.ts` using
    `drizzle-orm/node-postgres`
-   [x] Better Auth wiring in `src/infrastructure/auth`
    (`better-auth` 1.7.7 exact pin, Drizzle adapter, database sessions,
    database rate-limit storage)
-   [x] Auth tables defined in the project's own Drizzle schema
    (`src/infrastructure/db/schema/auth.ts`): all IDs `uuid`,
    `rate_limits.last_request` as `bigint`
-   [x] `drizzle.config.ts` loads `.env.local`; schema glob
    `src/infrastructure/db/schema/*.ts`; Drizzle Kit is the only
    migration tool
-   [x] Auth migration generated: `drizzle/0000_init_auth.sql`
-   [x] Stage 5b passed (2026-10-21): `pnpm db:migrate` applied to
    `db_fintry`; pgAdmin verified — 6 tables
    (`drizzle.__drizzle_migrations`, `users`, `sessions`, `accounts`,
    `verifications`, `rate_limits`); `users.id`, `sessions.id`,
    `sessions.user_id`, `accounts.id`, `accounts.user_id` are `uuid`;
    only two FKs (`accounts`, `sessions` → `users`) both
    `ON DELETE cascade`; `drizzle.__drizzle_migrations` has 1 row

This closes the Better Auth UUID gate in the repository (ADR-003

### Domain Schema per ADR-002 — All Parts (2026-10-21)

-   [x] Part 6a: `assets` + `categories` — schema, migration
    `0001_domain_assets_categories.sql`, applied and verified
-   [x] Part 6b: `transactions` — schema, migration
    `0002_domain_transactions.sql`, applied and verified
-   [x] Part 6c: `asset_adjustments` — schema, migration
    `0003_domain_asset_adjustments.sql`, applied and verified
-   [x] Part 6d: `pending_intents` + `idempotency_keys` + `audit_log`
    — schema, migration `0004_domain_remaining.sql`, applied and
    verified
-   [x] All 12 public tables present in `db_fintry`
-   [x] All 8 enums created (`asset_type`, `transaction_type`,
    `transaction_status`, `adjustment_type`, `pending_intent_kind`,
    `pending_intent_status`, `audit_entity_type`, `audit_action`)
-   [x] 5 migrations in `drizzle.__drizzle_migrations`
-   [x] Lint and typecheck clean after all schema files

Design calls (from ADR-002 section 8 open items):

-   Case-insensitive uniqueness: unique expression indexes on
    `(user_id, lower(name))`, not generated columns
-   Asset-name uniqueness covers inactive assets (no reactivation)
-   `delta` column on `asset_adjustments` is a regular column with
    CHECK `delta = value_after - value_before` (Drizzle Kit does not
    reliably generate `GENERATED ALWAYS AS` for bigint)
-   No `CHECK (is_active OR current_value = 0)` on `assets`;
    deactivation lifecycle engine-enforced
-   Naming convention: `*_uk` unique constraints, `*_uidx` unique
    indexes, `*_idx` indexes, `*_ck` checks, `*_fk` foreign keys

Schema files:

```text
src/infrastructure/db/schema/
├── auth.ts              (users, sessions, accounts, verifications, rate_limits)
├── common.ts            (timestamptz helper)
├── assets.ts            (assets, assetTypeEnum)
├── categories.ts        (categories)
├── transactions.ts      (transactions, transactionTypeEnum, transactionStatusEnum)
├── asset-adjustments.ts (assetAdjustments, adjustmentTypeEnum)
├── pending-intents.ts   (pendingIntents, pendingIntentKindEnum, pendingIntentStatusEnum)
├── idempotency-keys.ts  (idempotencyKeys)
└── audit-log.ts         (auditLog, auditEntityTypeEnum, auditActionEnum)
```

### Database Constraint and Isolation Verification — Stage 7 (2026-10-21)

-   [x] 12 public tables verified
-   [x] 8 PostgreSQL enums verified
-   [x] 5 migrations verified in `drizzle.__drizzle_migrations`
-   [x] FK on-delete policy verified: auth cascades, all domain FKs RESTRICT
-   [x] CHECK constraints verified on `assets`, `categories`,
    `transactions`, `asset_adjustments`, `pending_intents`
-   [x] Ownership isolation test passed: cross-user transaction insertion
    rejected by PostgreSQL via `transactions_destination_asset_fk`
    violation
-   [x] Test data cleaned up cleanly

### Domain Layer Core — Stage 8 (2026-10-21)

-   [x] `src/domain/types.ts` — pure domain types: Asset, Category,
    Transaction, AssetAdjustment + enum string unions
-   [x] `src/domain/money.ts` — `assertPositiveAmount`,
    `assertNonNegativeAmount`, `formatIdr`; bigint only
-   [x] `src/domain/category.ts` — `normalizeCategoryName` implementing
    domain_rules.md §11.1 (NFKC, trim, collapse whitespace, 1–40,
    allowed character classes, at least one letter); one validator
    shared by user input and AI output
-   [x] `src/domain/accounting.ts` — `applyIncome` (§3), `applyExpense`
    (§4), `applyTransfer` (§5), `applyValuation` (§7), `applyAdjustment`
    (§8 + §8.1 no-op rejected), `netWorth` (§10); negative results
    rejected (§15); pure functions, no DB/LLM dependency
-   [x] Tests: `src/domain/__tests__/accounting.test.ts` (6 fast-check
    property tests + 4 explicit cases),
    `src/domain/__tests__/category.test.ts` (9 cases) — 19/19 passing
-   [x] `tsc --noEmit`, `pnpm lint`, `pnpm build` clean
-   [x] `tsconfig.json` target ES2017 → ES2020 (required for BigInt
    literals)

### Repositories and Atomic Mutation Flow — Stage 9 (2026-10-21)

-   [x] `src/infrastructure/repositories/types.ts` — `Db` dan `Executor`
    (untuk interactive transaction)
-   [x] `src/infrastructure/repositories/assets.ts` — `createAsset`,
    `getAssetById`, `listAssets`, `lockAssetsByIds` (`FOR UPDATE` id
    ASC per ADR-002 §2.4 langkah 4), `setAssetValue`, `deactivateAsset`
    (guard `current_value = 0n`)
-   [x] `src/infrastructure/repositories/categories.ts` —
    `findCategoryByName`, `findOrCreateCategory` (atomik via `ON CONFLICT
    DO NOTHING`), `listCategories`
-   [x] `src/infrastructure/repositories/idempotency.ts` —
    `claimIdempotency` (claimed / replay / conflict),
    `saveIdempotencyResult`
-   [x] `src/infrastructure/repositories/transactions.ts` —
    `insertTransaction`, `getTransactionById`, `lockTransactionById`,
    `listTransactions`, `markTransactionVoided`,
    `editTransactionDetails` (non-finansial saja per D2),
    `listReplacementsOf`
-   [x] `src/infrastructure/repositories/adjustments.ts` —
    `insertAdjustment`, `listAdjustmentsByAsset`,
    `sumAdjustmentDeltas` (append-only, tanpa update/delete per D3)
-   [x] `src/infrastructure/repositories/audit.ts` — `insertAudit`,
    `listAuditByUser`, `listAuditByEntity` (append-only)
-   [x] `src/infrastructure/repositories/pending-intents.ts` —
    `insertPendingIntent`, `getPendingForUser`, `finalizePendingIntent`
    (RESOLVED/CANCELLED/EXPIRED), `cancelPendingForUser`,
    `listExpiredPending`
-   [x] Scratch database `db_fintry_test` dibuat otomatis via
    `scripts/prepare-test-db.mjs` (vitest globalSetup) +
    `vitest.config.ts`
-   [x] Tests:
    `src/infrastructure/__tests__/scoping.test.ts` (user scoping,
    unique lower(name), cross-tenant FK rejection) +
    `src/infrastructure/__tests__/mutation-flow.test.ts` (ADR-002
    flow: lock → engine → update → insert → audit, idempotency replay,
    payload conflict rejection, rollback on failure, concurrent
    no-double-spend, reconciliation test) — 13 integration tests
-   [x] Total tests: 32/32 passing (19 domain + 13 integration)
-   [x] Baseline check: `tsc --noEmit`, `pnpm lint`, `pnpm build` clean

### Application Commands — Stage 10 (2026-10-21)

-   [x] `src/application/commands/common.ts` — `todayJakarta()` helper (Asia/Jakarta timezone default)
-   [x] `src/application/commands/income.ts` — `executeCreateIncome` (idempotency, lock destination, applyIncome, category find-or-create, insert transaction, audit)
-   [x] `src/application/commands/expense.ts` — `executeCreateExpense` (lock source, applyExpense with InsufficientBalanceError check, category, transaction, audit)
-   [x] `src/application/commands/transfer.ts` — `executeCreateTransfer` (lock source & destination sorted by id ASC, applyTransfer, category strictly null, recognizes INVESTMENT purchase per PRD §6.4)
-   [x] `src/application/commands/opening-balance.ts` — `executeCreateOpeningBalance` (strict value_before=0, delta=amount, partial unique index enforces max 1 per asset)
-   [x] `src/application/commands/adjustment.ts` — `executeCreateBalanceAdjustment` (reconciliation, delta non-zero check, negative prevention, append-only)
-   [x] `src/application/commands/void-transaction.ts` — `executeVoidTransaction` (balance reversal, negative check, inactive asset rejection, status=VOIDED, audit)
-   [x] `src/application/commands/edit-transaction.ts` — `executeEditTransaction` (direct edit for description/category/date; VOID + replacement in one DB tx for financial fields per D2)
-   [x] `src/application/commands/index.ts` — barrel export
-   [x] Tests: `src/application/commands/__tests__/commands.test.ts` (13 comprehensive integration tests)
-   [x] Total tests: 45/45 passing across test suites
-   [x] Baseline check: `tsc --noEmit`, `pnpm lint`, `pnpm build` clean

### Financial Query Services — Stage 11 (2026-10-21)

-   [x] `src/application/services/net-worth.ts` — `calculateNetWorth(userId)` (sum active asset balances, count assets)
-   [x] `src/application/services/summary.ts` — `getDashboardSummary(userId)` (net worth + cash/investment breakdown + asset list + recent tx count)
-   [x] `src/application/services/ledger.ts` — `listLedgerTransactions(userId, filter)` (ACTIVE/VOIDED filter by type, enrich with category names, ORDER BY date DESC)
-   [x] `src/application/services/index.ts` — barrel export
-   [x] Tests: `src/application/services/__tests__/services.test.ts` (3 integration tests verifying net worth = sum of ledger transactions per user)
-   [x] Total tests: 48/48 passing across all suites
-   [x] Baseline check: `tsc --noEmit`, `pnpm lint`, `pnpm build` clean

### AI Parser Boundary & Intent Validation — Stage 12–13 (2026-10-21)

-   [x] `src/application/parser/types.ts` — `FinancialIntent`, `ParseResult`, `ParserAmbiguity`, `TransactionParser` interfaces
-   [x] `src/application/parser/schemas.ts` — Zod schemas with positive bigint transforms, UUID assertions, and cross-asset validation
-   [x] `src/application/parser/extractors.ts` — `parseIndonesianAmount` (supports rb, k, jt, Rp 50.000) & `matchAssetByName`
-   [x] `src/application/parser/simple-rules.ts` — `SimpleRulesParser` (offline regex-based parser, zero LLM quota consumption, ambiguity and missing field detection)
-   [x] `src/application/parser/mock-parser.ts` — `MockParser` (canned results & deterministic testing)
-   [x] `src/application/parser/index.ts` — barrel export
-   [x] Tests: `src/application/parser/__tests__/parser.test.ts` (10 tests covering amount parsing, natural language income/expense/transfer, ambiguity warning on unknown assets, missing fields)
-   [x] Total tests: 58/58 passing across all suites
-   [x] Baseline check: `tsc --noEmit`, `pnpm lint`, `pnpm build` clean

### Chat-to-Intent Flow — Stage 14 (2026-10-21)

-   [x] `src/application/chat/chat-service.ts` — `processChatMessage(db, userId, rawMessage, customParser)`
    (resolves active assets, parses message, routes to command execution atomically, returns human-friendly response with balance)
-   [x] `src/application/chat/index.ts` — barrel export
-   [x] Tests: `src/application/chat/__tests__/chat-flow.test.ts` (7 integration tests: expense, income, cash transfer, investment purchase, format guidance for unrecognized message, clarification on unknown asset, atomic rollback on insufficient balance)
-   [x] Total tests: 65/65 passing across all suites
-   [x] Baseline check: `tsc --noEmit`, `pnpm lint`, `pnpm build` clean

### Authentication UI — Stage 15–16 (2026-10-21)

-   [x] `src/app/api/auth/[...all]/route.ts` — Better Auth Next.js App Router handler
-   [x] `src/infrastructure/auth/client.ts` — Browser auth client (signIn, signUp, signOut, useSession)
-   [x] `src/infrastructure/auth/session.ts` — `getServerSession()` server-side session helper
-   [x] `src/app/login/page.tsx` — Login form (email + password, error handling, redirect to home)
-   [x] `src/app/register/page.tsx` — Registration form (email + password + confirmation, name derived from email prefix per ADR-003 §2.5)
-   [x] `src/components/auth/logout-button.tsx` — Client-side logout button component
-   [x] `src/app/page.tsx` — Homepage with auth-gated dashboard (unauthenticated: landing page with CTAs; authenticated: net worth summary + user header)
-   [x] Total tests: 65/65 passing (no regressions)
-   [x] Baseline check: `tsc --noEmit`, `pnpm lint`, `pnpm build` clean
-   [x] Routes: `/login`, `/register`, `/api/auth/[...all]` (dynamic), `/` (server-rendered with session)

### Dashboard UI — Stage 17–19 (2026-10-21)

-   [x] `src/app/dashboard/actions.ts` — Server actions: `createAssetAction`, `sendChatMessageAction`
-   [x] `src/app/dashboard/page.tsx` — Full dashboard layout (net worth cards, chat input, asset list, transaction ledger)
-   [x] `src/components/dashboard/chat-input.tsx` — Natural language chat input with response display
-   [x] `src/components/dashboard/asset-list.tsx` — Server-rendered active asset list with balances
-   [x] `src/components/dashboard/add-asset-dialog.tsx` — Modal dialog for creating new assets with opening balance
-   [x] `src/components/dashboard/transaction-ledger.tsx` — 20 most recent transactions with type badges and formatted amounts
-   [x] `src/app/page.tsx` — Updated to redirect authenticated users to `/dashboard`
-   [x] Total tests: 65/65 passing (no regressions)
-   [x] Baseline check: `tsc --noEmit`, `pnpm lint`, `pnpm build` clean
-   [x] Routes: `/dashboard` (auth-gated, server-rendered with revalidation on actions)

### Transaction History UI — Stage 20 (2026-10-22)

-   [x] `src/application/services/ledger.ts` — `listLedgerTransactions` now
    includes asset names and `replacedByTransactionId`, supports status `ALL`;
    new `countLedgerTransactions` for pagination
-   [x] `src/app/dashboard/history/page.tsx` — full history page with
    type/status filter pills, 20-row pagination, VOIDED rows visible
-   [x] `src/components/dashboard/transaction-history.tsx` — history list with
    Edit/Batalkan actions, replacement-chain notes, success notices
-   [x] `src/components/dashboard/edit-transaction-dialog.tsx` — direct edit
    (description/category/date) vs VOID + replacement (amount/assets) per D2
-   [x] `src/components/dashboard/void-transaction-dialog.tsx` — void
    confirmation with optional reason
-   [x] `src/app/dashboard/actions.ts` — `voidTransactionAction`,
    `editTransactionAction` (session guard + revalidate dashboard/history)
-   [x] `src/components/dashboard/history-types.ts` — serialisable view models
    (BigInt amounts cross the RSC boundary as strings)
-   [x] Dashboard header links to `/dashboard/history`; recent ledger shows
    "Lihat semua →"
-   [x] `.env.local` now defines `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`
    (removes the Better Auth default-secret warning)
-   [x] Tests: 5 new integration tests in
    `src/application/services/__tests__/ledger-history.test.ts` (voided
    visibility, asset names, replacement chain, filters, pagination)
-   [x] Total tests: 70/70 passing (no regressions)
-   [x] Baseline check: `tsc --noEmit`, `pnpm lint`, `pnpm build` clean
-   [x] Routes: `/dashboard/history` (auth-gated, dynamic)


### E2E Playwright Coverage + Polish — Stage 21–22 (2026-10-22)

-   [x] **E2E Infrastructure**: `scripts/prepare-e2e-db.mjs` (derives `db_fintry_e2e` from `DATABASE_URL`), `scripts/e2e-server.mjs` (Next dev on port 3100 with isolated E2E database), `playwright.config.ts` (workers=1, timeout 120s, webServer with 240s startup), `package.json` script `test:e2e`, `.gitignore` updated (test-results, playwright-report)
-   [x] **E2E Specs** (214 lines across 4 files):
    -   `e2e/helpers.ts` — `uniqueEmail`, `registerUser`, `loginUser`, `logoutUser`, `createAsset`, `sendChat` (all with proper `waitForURL` + visibility checks)
    -   `e2e/auth.spec.ts` — 5 tests (register → dashboard, redirect unauthenticated, logout, login success, password error)
    -   `e2e/dashboard-flow.spec.ts` — alur utama (create 2 assets with opening balance 1jt, expense 25rb, transfer 100rb, income 50rb → net worth Rp1.025.000, ledger shows all 3 tx)
    -   `e2e/history.spec.ts` — edit amount 100rb→50rb triggers VOID + replacement with chain notes, then void replacement → both VOIDED, filter status=VOIDED shows both, net worth restored to 1jt
-   [x] **E2E Results**: 7/7 tests pass (auth 5/5, dashboard-flow 1/1, history 1/1); occasional Better Auth rate-limit flake expected when running full suite rapidly (resolved on retry)
-   [x] **Polish**:
    -   `src/app/layout.tsx` — metadata updated (`title: "Fintry — Kelola Keuangan Pribadi via Chat"`, `description` Indonesian, `lang="id"`)
    -   `src/app/error.tsx` — global error boundary (reset button + link to dashboard)
    -   `src/app/not-found.tsx` — custom 404 page
    -   `src/app/dashboard/loading.tsx`, `src/app/dashboard/history/loading.tsx` — skeleton loading states
    -   Accessibility: all dialog components (`add-asset-dialog.tsx`, `edit-transaction-dialog.tsx`, `void-transaction-dialog.tsx`) now have `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `htmlFor`/`id` on labels; error boxes have `role="alert"`; chat response and history notice have `role="status"` + `aria-live="polite"`
    -   Dashboard header email hidden on small screens (`hidden sm:inline`)
-   [x] Total tests: 70 unit/integration + 7 E2E = 77 passing
-   [x] Final gate: `tsc --noEmit`, `pnpm lint`, `pnpm exec vitest run` (70/70), `pnpm build`, `pnpm exec playwright test` (7/7 with 1 retry on rate-limit) — all clean
-   [x] Routes: all existing routes preserved (`/`, `/login`, `/register`, `/api/auth/[...all]`, `/dashboard`, `/dashboard/history`)


### Pre-Deployment Improvements — Stage 23 (2026-10-24)

-   [x] **UX Polish**:
    -   Chat input note — panduan format bebas, tekankan keyword (beli/gaji) + nominal + akun
    -   Auto-format input nominal — `formatInputAmount` helper dengan separator ribuan (.) untuk add-asset saldo awal dan edit-transaction amount (`src/lib/format-input.ts`)
-   [x] **CASH Asset Type**:
    -   `asset_type` enum extended — `CASH` added as 4th type (migration `0005_tiresome_exiles.sql`)
    -   Domain types updated — `AssetType` union includes `"CASH"`
    -   UI updated — add-asset dropdown option "Kas/Tunai", summary service `AssetSummaryItem` type
-   [x] **Forgot Password Flow**:
    -   Better Auth config — `sendResetPassword` callback with Resend email provider (dev mode: console log if `RESEND_API_KEY` unset)
    -   `/forgot-password` page — input email, triggers `authClient.requestPasswordReset`
    -   `/reset-password` page — input new password with token validation from URL query params, Suspense boundary for `useSearchParams()`
    -   Login page — "Lupa password?" link added
    -   `.env.example` — documented `RESEND_API_KEY` (optional, free tier 100 emails/day)
-   [x] Dependencies: `resend` 6.34.1 installed
-   [x] Total tests: 70 unit/integration (unchanged, no test coverage for UI-only changes)
-   [x] Final gate: `tsc --noEmit`, `pnpm lint`, `pnpm exec vitest run` (70/70), `pnpm build` — all clean
-   [x] Routes: added `/forgot-password`, `/reset-password` (total 10 routes now)


### Security Audit + Profile Menu — Stage 24 (2026-10-24)

-   [x] **Security Audit**:
    -   Reviewed authentication (Better Auth bcrypt, rate limiting, password reset tokens)
    -   Reviewed authorization (session guards on all routes + server actions, user isolation via `userId` filter)
    -   Reviewed input validation (Zod schemas, SQL injection prevention via Drizzle parameterized queries)
    -   Reviewed CSRF protection (Next.js App Router built-in Origin/Referer checks)
    -   Reviewed secrets management (`.env*` gitignored, `.env.example` template)
    -   **Decision**: skip email verification saat register (MVP personal use, change-email jadi escape hatch); tambah email verification nanti kalau public launch
    -   **Security posture**: solid untuk development/learning phase; P0 (HTTPS + production env separation) dan P1 hardening (rate limiting actions, password strength, session sameSite) untuk production
-   [x] **Profile Menu**:
    -   `src/components/dashboard/profile-dropdown.tsx` — user icon dropdown dengan menu: Change Password, Change Email, Logout
    -   `src/components/dashboard/change-password-dialog.tsx` — modal dengan current password + new password + confirm, `authClient.changePassword` dengan `revokeOtherSessions: true`
    -   `src/components/dashboard/change-email-dialog.tsx` — modal dengan new email only (Better Auth kirim verification ke email baru otomatis), `authClient.changeEmail` dengan `callbackURL`
    -   `src/components/dashboard/dashboard-navbar.tsx` — client wrapper untuk dashboard navbar dengan profile dropdown
    -   `src/components/dashboard/history-navbar.tsx` — variant navbar untuk history page (back button + profile dropdown)
    -   `src/app/dashboard/page.tsx` — updated gunakan `DashboardNavbar` component
    -   `src/app/dashboard/history/page.tsx` — updated gunakan `HistoryNavbar` component
    -   Better Auth config — `user.changeEmail.enabled: true` dan `emailVerification.sendVerificationEmail` untuk kirim verification ke email baru (dev mode: console log)
-   [x] Total tests: 70 unit/integration (unchanged, UI-only changes)
-   [x] Final gate: `tsc --noEmit`, `pnpm lint`, `pnpm exec vitest run` (70/70), `pnpm build` — all clean
-   [x] Routes: unchanged (10 routes)

## In Progress

Nothing in progress. MVP complete. Next: deployment preparation, production hardening, atau P1 features (investment valuation, category management UI).
## Current Technical State

### Dependencies

Installed baseline versions are recorded in `tech_stack.md`. The driver
is `pg` + `@types/pg`; `postgres` is removed from the repository.

### Database

`db_fintry` on local PostgreSQL 18 holds the full schema: 5 auth
tables + 7 domain tables (12 public total), 8 enums, 5 applied
migrations. All composite FKs use `ON DELETE RESTRICT`; auth FKs use
`CASCADE`. Schema matches ADR-002 specification.

### Authentication

Better Auth 1.7.7 (exact pin) wired in `infrastructure/auth`. UUID
gate passed (stage 5b). Auth tables defined in the project's Drizzle
schema.

### Financial Engine

Implemented: pure domain accounting (`src/domain/accounting.ts`) plus 7
application commands with idempotency, lock ordering, and audit (stages 8–10).

### AI Parser

Implemented offline `SimpleRulesParser` with Zod intent schemas (stages
12–13). An AI strategy can be added behind the `TransactionParser` interface.

### Dashboard & History

Implemented (stages 17–20): summary cards, chat input, asset list, recent ledger, `/dashboard/history` with filters, pagination, direct edit, void + replacement, replacement chains. Stage 21–22 added E2E coverage + polish (metadata, error boundary, 404, loading, accessibility).

### Testing

70 unit/integration tests (vitest) + 7 E2E tests (Playwright) = 77 total. Coverage: domain logic, repositories, commands, services, parser, chat flow, auth, dashboard flow, transaction history edit/void.

### Investment Valuation

Not yet implemented (P1; domain rules in `domain_rules.md` section 7
still apply).

## Resolved Documentation Conflicts

Resolved using the hierarchy in `AGENTS.md` (Documentation Hierarchy).

1.  **Hierarchy order differed** between `AGENTS.md` and `rules.md`
    section 3 → `AGENTS.md` is the single authority; `rules.md` defers
    to it.
2.  **Negative balance** was conditional in `domain_rules.md` section 15
    ("if product rules require") → final: rejected (explicit user
    decision D1).
3.  **Transaction edit semantics** were missing (PRD section 12 required
    editing; `domain_rules.md` section 17 only covered reversal) →
    defined by D2 in `domain_rules.md` section 17.2.
4.  **Categories**: PRD placed "Custom categories" in P1 while P0
    transactions carry `category_id` and the README promises automatic
    categories → automatic creation via chat is P0, category management
    is P1 (D5; PRD section 23 clarified).
5.  **Account/data deletion** was listed as minimal security in PRD
    section 18 while financial history must never be physically deleted
    → deferred from the MVP (D10; PRD sections 18 and 24).
6.  **Investment valuation**: PRD section 23 says P1,
    `project_overview.md` listed it as mandatory → PRD outranks
    `project_overview.md`: P1; `project_overview.md` annotated.
7.  **Asset edit/deactivation**: mandatory in `project_overview.md` but
    not listed in PRD section 23 (PRD silent, not contradictory) →
    added to PRD P0, with the deactivation rules from D4 in
    `domain_rules.md` section 2.1.
8.  **PRD file name**: `PRD.md` vs `PRD_v1.1.md` → canonical is
    `docs/PRD.md` (the actual file name, used by `AGENTS.md`, ADR-001,
    and `rules.md`). Stale `PRD_v1.1.md` references in
    `project_overview.md` section 7, ADR-002, and ADR-003 are corrected.
9.  **`progress.md` was stale** (stack/auth/driver decisions and
    versions marked open) → versions are recorded in `tech_stack.md`,
    and this file is updated.

## AI Agent Workflow Decisions

### One Prompt = One Primary Outcome

-   Large task: one primary task/outcome only.
-   Small task: maximum 2--4 closely related actions.
-   Large implementation phases must be split into sequential
    checkpoints.
-   Agents must stop after the requested checkpoint.
-   Agents must not automatically continue into the next phase.

### Environment and Setup

AI agents must not assume access to the user's local operating system,
terminal, browser, database, external accounts, credentials, or secrets.

For installation/configuration tasks:

`Prerequisite check → installation → configuration → environment variables → verification → implementation → tests`

If the agent cannot perform an environment action itself, it must guide
the user step-by-step and wait for the result.

The agent must never claim an operation succeeded without verification.

### Code Quality

The implementation should:

-   prefer a single source of truth;
-   reuse existing utilities and modules;
-   avoid duplicated business logic;
-   avoid duplicated validation/parsing/normalization;
-   avoid duplicated constants and database access patterns;
-   avoid unnecessary abstractions;
-   avoid opportunistic refactoring;
-   keep unrelated technical debt as a follow-up item.

## Known Issues / Pending Decisions

-   [ ] Confirm the part 6a design calls (unique expression index;
    asset-name uniqueness covers inactive assets) at migration review
-   [ ] Open decision: add `CHECK (is_active OR current_value = 0)` on
    `assets`? Not in ADR-002's table spec; lifecycle is
    engine-enforced for the MVP
-   [ ] Idempotency-key retention/cleanup policy — decide in part 6d
-   [ ] Parser specification: closed cancel/confirm word lists and the
    category-name context given to the parser
-   [ ] Rate limiting for chat/financial endpoints is not decided (auth
    endpoints are covered by Better Auth)
-   [ ] Asset edit (rename, type change) has no rules yet; deactivation
    rules exist
-   [ ] Investment valuation stays P1; implementation is a later
    checkpoint
-   [ ] Housekeeping: the foundation/auth/domain files are not
    committed (`git log` shows only the Create Next App commit);
    checkpoint commits pending user decision

## Important Technical Decisions

### LLM does not directly mutate financial state

Financial calculations and mutations must be deterministic, validated,
atomic, and auditable.

### Transfer is not an expense

A transfer only moves value between assets and does not change net
worth.

### Investment purchase is a transfer

Buying an investment moves value from a cash asset to an investment
asset.

### Investment valuation is separate from transaction

Market value changes are not cashflow transactions.

### Opening balance is separate from income

The initial recorded state of an asset should not distort income
reporting.

### Balance adjustment is separate from expense/income

Reconciliation should not create artificial cashflow.

### Negative balances are rejected in MVP

Credit/debt behavior is outside the current MVP financial model. The
engine validates; the database CHECK `current_value >= 0` is a second
layer.

### Financial transaction correction uses VOID + replacement

Financial history must remain auditable and should not be silently
overwritten. Only `description`, `category_id`, and `transaction_date`
are edited in place.

### Asset adjustments are append-only

Historical reconciliation and valuation events remain traceable.

### One pending intent per user

A short clarification should map to one deterministic pending intent and
avoid ambiguous execution. TTL is 10 minutes; routing is application
code, never the LLM.

### Separate idempotency table

Idempotency must be enforced consistently across financial mutation
commands.

### Categories are normalized and validated by one function

AI-suggested and user-typed categories pass the same validator; an
invalid category never blocks recording a transaction.

### Better Auth for MVP

Better Auth provides the selected email/password/session foundation
while keeping authentication replaceable. Drizzle Kit remains the only
migration tool; Better Auth's migration CLI is not used.

### `pg` / node-postgres

Selected as the PostgreSQL driver for Drizzle and the infrastructure
layer. Both `pg` and `postgres` can run interactive transactions and row
locks; `pg` was chosen for portability across poolers and providers.

### RLS and database-level append-only triggers are deferred

Compensating controls: repository scoping, composite foreign keys,
repositories without update/delete paths, and tests.

## Next Tasks

Done: dependency change, auth wiring, UUID gate (stage 5b), full
domain schema (parts 6a–6d applied and verified), constraint and
isolation verification (stage 7), domain layer core (stage 8),
repositories + scratch test DB + mutation flow (stage 9).

1.  [x] Verify database constraints and ownership isolation (stage 7).
2.  [x] Implement domain types and value objects (stage 8).
3.  [x] Implement repositories with ADR-002 lock order and user scoping (stage 9).
4.  [x] Implement application commands (stage 10).
5.  [x] Implement financial engine orchestration and query services (stage 11).
6.  [x] Implement AI parser boundary and structured intent validation (stage 12-13).
7.  [x] Implement chat-to-intent flow (stage 14).
8.  [x] Implement auth UI (stage 15-16).
9.  [x] Implement dashboard UI (stage 17-19).
10. [x] Implement transaction history/correction/reversal UI (stage 20).
11. Add E2E Playwright coverage and polish (stage 21-22).
Each item is a checkpoint.

## Change Log

### 2026-10-21

-   Stage 5b passed: auth migration applied and verified.
-   Full domain schema implemented and applied in 4 parts:
    6a (`assets`, `categories`), 6b (`transactions`),
    6c (`asset_adjustments`), 6d (`pending_intents`,
    `idempotency_keys`, `audit_log`). All migrations applied to
    `db_fintry` and verified by the user in pgAdmin. 12 public tables,
    8 enums, 5 migrations total.
-   Design calls recorded: unique expression indexes, delta CHECK,
    naming convention, no `is_active`/`current_value` CHECK.
-   `progress.md` updated to reflect completed foundation and schema.
-   Stage 7 passed: constraint audit and composite FK cross-user
    isolation test verified on `db_fintry`. Cross-tenant reference
    rejected at database level.
-   Stage 8 passed: pure domain layer core (`src/domain/`) — types,
    money, category validator, deterministic accounting; 19/19 Vitest
    tests incl. fast-check properties (transfer conservation,
    no-negative balances, valuation delta, net-worth sum).
-   `tsconfig.json` target ES2017 → ES2020 (BigInt literals); baseline
    re-verified: tsc clean, lint clean, production build passed.

-   Stage 9 passed: full repository layer (`src/infrastructure/repositories/`)
    covering assets (FOR UPDATE id ASC), categories (find-or-create),
    transactions (no physical delete, non-financial edit only),
    adjustments (append-only), audit_log (append-only), idempotency_keys
    (claim/replay/conflict), pending_intents (TTL + supersede).
-   Scratch integration database `db_fintry_test` wired via Vitest
    globalSetup; 13 integration tests passed (32 total across suite).
-   Verified ADR-002 §2.4 atomic mutation flow: idempotency replay,
    concurrent no-double-spend, rollback on InsufficientBalanceError,
    reconciliation equality between stored balance and active ledger.
-   Stage 10 passed: application commands (`src/application/commands/`) covering
    `executeCreateIncome`, `executeCreateExpense`, `executeCreateTransfer`,
    `executeCreateOpeningBalance`, `executeCreateBalanceAdjustment`,
    `executeVoidTransaction`, and `executeEditTransaction` (direct edit vs.
    VOID + replacement per D2).
-   All commands verified with 13 new integration tests on `db_fintry_test`.
-   Total suite: 45/45 passing. Lint, typecheck, production build clean.
### 2026-10-09

-   D2, D5, D6, D11, and the PostgreSQL driver approved; D1--D11 are
    all final.
-   ADR-002 and ADR-003 audited; documentation checked against the final
    decisions; documentation conflicts resolved and recorded.
-   Better Auth UUID gate passed in a sandbox (20/20); the repository
    gate is still pending.
-   Dependency change, install, lint, and build were not run in this
    session (no repository access).

### 2026-10-08

-   Finalized review of D1--D11.
-   Finalized D4 inactive-asset behavior.
-   Finalized Better Auth as MVP authentication with UUID gate.
-   Finalized `pg` / node-postgres as PostgreSQL driver.
-   Established focused AI-agent task budgeting: One Prompt = One
    Primary Outcome.
-   Established maximum 2--4 closely related actions for small tasks.
-   Established user-guided execution protocol for
    installation/configuration tasks.
-   Established environment capability awareness for multi-agent
    development.
-   Established code reuse / single-source-of-truth rules.
-   Established scope-controlled refactoring rules.
-   Verified project foundation with successful install, lint, and
    production build.
-   A documentation/ADR follow-up task was interrupted by a usage limit;
    its output was audited on 2026-10-09.

### 2026-10-06

-   Created PRD.
-   Created domain rules.
-   Created project overview and scope boundaries.
-   Created AI development rules.
-   Created technical architecture baseline.
-   Established initial development progress memory.