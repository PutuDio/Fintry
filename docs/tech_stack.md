# Fintry Technical Stack

## 1. Purpose

This document defines the technical stack and architectural constraints for Fintry.

It is the technical source of truth for implementation.

The stack is designed around deterministic financial logic, strong data integrity, type safety, schema-validated AI output, provider-agnostic AI integration, simple MVP development, testability, and low operating cost.

Technology versions should be pinned during implementation/scaffolding using currently supported stable/LTS releases rather than relying on version numbers written from memory.

---

## 2. Final Stack Decision

### Application

- Full-stack framework: **Next.js**
- Language: **TypeScript**
- Routing: **Next.js App Router**
- UI styling: **Tailwind CSS**
- UI components: **shadcn/ui**
- Validation/schema: **Zod**

### Database

- Database: **PostgreSQL**
- ORM: **Drizzle ORM** (`drizzle-orm/node-postgres`)
- Driver: **`pg` (node-postgres)**; the `postgres` package is not used (see section 7)
- Migration tool: **Drizzle Kit** (the only migration tool)
- Monetary storage: **BIGINT** for MVP IDR amounts
- Database transactions: PostgreSQL interactive transactions
- Row locking: PostgreSQL `FOR UPDATE` where required
- Runtime: database code runs on the **Node.js runtime** (not Edge)

### Authentication

- Authentication library: **Better Auth** (exact version pinned); see section 19 and ADR-003
- MVP authentication: **email + password** with **database sessions**
- User IDs are PostgreSQL **UUID**
- Authentication code lives only in `infrastructure/auth`; application and domain code only know `userId`
- The authentication implementation must remain replaceable behind that boundary
- Email verification, OAuth, MFA, account deletion, email change, plugins, and stateless sessions are not enabled in the MVP

### Testing

- Unit/domain tests: **Vitest**
- Property-based testing where useful: **fast-check**
- Integration tests: PostgreSQL test database/container
- E2E: **Playwright**

### Deployment

Initial deployment may use a Next.js-compatible host such as Vercel and managed PostgreSQL such as Neon. These are deployment choices, not architectural dependencies.

Fintry must remain deployable to another compatible runtime and PostgreSQL provider without changing the financial domain model.

### Baseline versions

Scaffolded 2026-10-08. These are the versions installed in the project, not versions written from memory. Better Auth is pinned to an exact version.

| Package | Version |
|---|---|
| Next.js | 16.3.8 |
| TypeScript | 5.9.3 |
| pnpm | 12.9.1 |
| Better Auth | 1.7.7 (exact pin) |
| Drizzle ORM | 0.45.3 |
| Zod | 4.6.5 |
| Vitest | 5.0.3 |
| fast-check | 4.10.2 |
| Playwright | 1.63.0 |
| AI SDK | 7.0.128 |
| `pg` and `@types/pg` | pinned when installed; replace the `postgres` package |

Drizzle Kit is required for migrations and was not part of the scaffolded version list; confirm it is installed and pinned.

---

## 3. Architecture

Fintry uses:

```text
Presentation
    ↓
Application
    ↓
Domain
    ↓
Infrastructure
```

Recommended structure:

```text
src/
├── app/
├── features/
│   ├── auth/
│   ├── assets/
│   ├── transactions/
│   ├── investments/
│   ├── categories/
│   ├── dashboard/
│   └── chat/
├── domain/
│   ├── assets/
│   ├── transactions/
│   ├── investments/
│   ├── accounting/
│   └── shared/
├── application/
│   ├── commands/
│   ├── queries/
│   ├── validators/
│   └── services/
├── infrastructure/
│   ├── db/
│   ├── repositories/
│   ├── ai/
│   ├── auth/
│   └── observability/
├── components/
├── lib/
└── types/
```

The exact structure may evolve, but responsibilities must remain separated.

---

## 4. Layer Responsibilities

### Presentation

Responsible for pages, layouts, UI, forms, chat, and dashboard rendering. It must not contain authoritative financial calculations.

### Application

Responsible for use cases, commands, queries, orchestration, authorization checks, validation coordination, and transaction execution coordination.

Examples:

```text
CreateIncome
CreateExpense
CreateTransfer
CreateInvestmentPurchase
CreateBalanceAdjustment
CreateOpeningBalance
ReverseTransaction
ResolvePendingIntent
```

### Domain

Responsible for financial rules, invariants, calculations, transaction semantics, balance logic, net-worth logic, and deterministic validation. It must not depend on an LLM provider, UI, or database implementation.

### Infrastructure

Responsible for PostgreSQL, Drizzle, repositories, AI provider adapters, authentication integration, external services, and observability.

---

## 5. Financial Engine

The financial engine is deterministic and must not depend on an LLM for authoritative financial state.

Core rules:

- income increases asset balance and net worth
- expense decreases asset balance and net worth
- transfer decreases source asset and increases destination asset
- transfer does not change net worth
- investment purchase is an asset-to-asset transfer
- investment valuation changes asset value and net worth
- opening balance is not income
- balance adjustment is reconciliation, not automatically income/expense
- reversal preserves audit history

All financial mutations must execute atomically.

---

## 6. Money Representation

For the MVP:

- currency is **IDR**
- monetary values are integers
- database monetary fields use **BIGINT**
- authoritative financial calculations must not use JavaScript floating-point arithmetic

Example:

```text
Rp25.000 → 25000
```

Multi-currency support requires a separate product/architecture decision.

---

## 7. Database

PostgreSQL is the authoritative persistence layer because Fintry requires strong transactions, concurrency control, constraints, foreign keys, indexes, and row-level locking.

Drizzle is the typed application database access layer. Database access should be centralized through repositories/services rather than scattered through UI code.

Raw SQL may be used when justified by locking, performance, PostgreSQL-specific features, or complex queries, but must still follow authorization and transaction rules.

### Driver and connection policy

- Driver: `pg` via `drizzle-orm/node-postgres`. The `postgres` package is not used.
- One `Pool` instance, created in `infrastructure/db`. The driver stays behind that boundary so it can be replaced without touching domain or application code.
- Financial mutations use interactive transactions with row locking (`SELECT ... FOR UPDATE`, Drizzle `.for('update')`). HTTP-based drivers without interactive transactions (for example `neon-http`) must not be used for financial mutations.
- Do not rely on session state: no session-level advisory locks and no session-level `SET`. The financial engine uses only transaction-scoped row locks, which keeps it compatible with PgBouncer in transaction mode.
- Runtime connections may use a pooler. **Migrations use a direct connection.**
- Code that touches the database runs on the Node.js runtime, not the Edge runtime.
- Drizzle Kit is the only migration tool. Better Auth's own migration command is not used.
- See ADR-002 for rationale and rejected alternatives.

---

## 8. Transaction Atomicity and Concurrency

Financial mutations follow this conceptual flow:

```text
BEGIN
  ↓
validate command
  ↓
lock relevant asset rows
  ↓
validate current state
  ↓
update asset state
  ↓
write transaction/ledger record
  ↓
write audit information
  ↓
COMMIT
```

On failure: `ROLLBACK`.

No partial financial mutation is allowed. Concurrency-sensitive operations must use database-level transaction and locking mechanisms.

### Lock order and validation

Lock order inside a financial transaction (to avoid deadlocks):

1. idempotency key insert
2. pending intent row (when resolving a pending intent)
3. transaction row (void, edit, replacement)
4. asset rows, ordered by `id ASC`

The engine reads asset values only after locking them. Default READ COMMITTED isolation is used together with these explicit row locks.

Asset values must never become negative (`domain_rules.md` section 15). The engine validates; the database `CHECK (current_value >= 0)` is a second layer.

Deadlock and lock failures map to a "concurrency conflict" error. The retry policy is defined at implementation time.

---

## 9. Financial Persistence Model

Final model (details and rationale: ADR-002):

```text
transactions
├── INCOME
├── EXPENSE
└── TRANSFER
    status: ACTIVE | VOIDED
    replaces_transaction_id (nullable)

asset_adjustments   (append-only)
├── OPENING_BALANCE
├── BALANCE_ADJUSTMENT
└── VALUATION

audit_log           (append-only)
idempotency_keys
pending_intents
categories          (per user)
assets
users               (owned by Better Auth, ADR-003)
```

- `assets.current_value` is derived state maintained by the financial engine inside the database transaction, protected by row locks. Net worth is computed on read, not stored.
- Reversal never physically deletes financial history: void sets `status = VOIDED` and `voided_at`.
- Edit semantics (direct edit for `description`, `category_id`, `transaction_date`; void + replacement for financial fields) are defined in `domain_rules.md` section 17.
- `asset_adjustments` have no update, void, or delete in the MVP.
- Domain tables reference `users(id)` with `ON DELETE RESTRICT`.
- Database-level append-only triggers are deferred from the MVP (ADR-002). Append-only behavior is enforced by the repository layer and tests.
- The exact Drizzle schema is written in the schema-implementation step that follows ADR-002.

---

## 10. AI Architecture

AI is an interpretation layer, not the financial authority.

```text
User
  ↓
Chat UI
  ↓
AI Provider Adapter
  ↓
Raw Structured Intent
  ↓
Zod Schema Validation
  ↓
Intent Validator
  ↓
Asset Resolver
  ↓
Financial Application Command
  ↓
Financial Engine
  ↓
PostgreSQL Transaction
```

The LLM must never directly write to PostgreSQL, mutate financial state, execute financial SQL, determine authoritative balances, bypass validation, or declare a mutation successful without an application result.

---

## 11. Provider-Agnostic AI

Fintry must support multiple AI providers and models. The project is intentionally **not locked to one AI provider**.

During the free/MVP phase, development and operation may use a mixture of coding agents, hosted models, free-tier models, OpenRouter or similar routing services, and local models where practical.

Use an adapter boundary:

```text
AIProvider
├── parseTransaction()
├── classifyIntent()
└── generateResponse()
```

Possible structure:

```text
infrastructure/ai/
├── provider.ts
├── openrouter/
├── provider-a/
├── provider-b/
└── mock/
```

Provider names are implementation details. The domain layer must depend on an internal interface, not a provider SDK.

---

## 12. AI Provider Selection

Provider/model selection should depend on the workload rather than assuming one model is best for everything.

Examples:

```text
Transaction parsing → fast + structured-output capable model
Complex reasoning   → stronger reasoning model
Simple response     → low-cost/fast model
Development/coding  → coding-focused model/agent
Testing              → deterministic mock provider
```

Changing a model/provider must not require changes to financial domain logic, database schema, or application command contracts.

---

## 13. Structured AI Output

AI output is untrusted external input.

Conceptual parser output:

```text
{
  intent: "EXPENSE",
  amount_text: "25rb",
  date_text: "kemarin",
  asset_name: "BCA",
  description: "makan siang",
  category_name: "Food"
}
```

The application performs deterministic normalization:

```text
"25rb" → 25000
"kemarin" → exact calendar date in Asia/Jakarta
```

Zod validation must occur before the structured intent enters the application workflow.

Category suggestions: `category_name` is untrusted input and passes the same normalization and validation as user-typed categories (`domain_rules.md` section 11.1). The parser may be given the user's existing category names (names only) as context to prefer reuse. The application still performs exact, normalized, case-insensitive matching only: no fuzzy or synonym matching.

---

## 14. Parser States

Supported states:

```text
EXECUTABLE
NEED_CONFIRMATION
NEED_CLARIFICATION
```

`EXECUTABLE`: required information exists and validation passes.

`NEED_CONFIRMATION`: action is understood but product rules require explicit confirmation.

`NEED_CLARIFICATION`: required information is missing or ambiguous.

Example: if "Bayar 50 ribu" could use multiple assets, the system must ask which asset.

---

## 15. Pending Intents

Pending intents persist multi-turn clarification and confirmation state, owned by the user.

Example:

```text
User: "Bayar makan 50 ribu"
AI: "Pakai BCA atau GoPay?"
User: "BCA"
```

Rules:

- At most one `PENDING` intent per user.
- TTL: **10 minutes** from creation, not extended. Kept as a configuration constant.
- Routing is deterministic application code. The LLM never decides whether a message answers a pending intent.

Message handling while a non-expired `PENDING` intent exists, in order:

1. **Cancel**: the whole normalized message is a word from a closed cancel list (for example "batal", "tidak", "gak", "no") → `CANCELLED`.
2. **Confirm** (`NEED_CONFIRMATION` only): the whole normalized message is a word from a closed affirmative list (for example "ya", "iya", "ok", "oke", "lanjut") → execute.
3. **Clarification answer** (`NEED_CLARIFICATION` only): the whole message matches an expected answer from `clarification_context`: an asset candidate name (optionally with a fixed prefix such as "pakai", "pake", "dari", "ke", "via"), or a whole-message amount expression accepted by the deterministic amount parser → treated as the answer.
4. **Anything else is a new message** and goes through the normal parser:
   - the parser finds a financial intent (type and amount detected, in any parser state) → the old pending intent becomes `CANCELLED` (superseded) and the new message is processed. If the new message itself needs clarification or confirmation, it becomes the single `PENDING` intent. The response tells the user that the previous request was cancelled.
   - the parser finds no financial intent → the pending intent stays `PENDING`, its question is repeated, and the user is reminded they can cancel.

The closed word lists are defined in the parser specification.

Execution: the stored structured intent is executed (no LLM re-parse). All validation and asset resolution run again against current state.

Status transitions:

| From | To | Trigger |
|---|---|---|
| PENDING | RESOLVED | answer or confirmation accepted and the mutation committed (same database transaction) |
| PENDING | CANCELLED | cancel command; superseded by a new financial intent; or answer accepted but the mutation was rejected by domain validation (result reported to the user) |
| PENDING | EXPIRED | `expires_at` passed |
| PENDING | PENDING | system error during execution (user may retry; idempotency prevents a duplicate mutation) |

`RESOLVED`, `CANCELLED`, and `EXPIRED` are final and never reopened. `resolved_at` is set on every final transition.

Expiry is evaluated on read. The partial unique index on `PENDING` does not consider `expires_at`, so the transaction that creates a new pending intent must first transition any existing one (expired or superseded) within the same database transaction. Concurrent messages are serialized by locking the pending row (`FOR UPDATE`).

---

## 16. Idempotency

Financial mutations initiated from chat must support idempotency. A suitable idempotency key should be associated with the originating request/message.

Goal:

```text
same request submitted twice → one financial mutation
```

Idempotency enforcement should be backed by the database where possible.

Implementation: a separate `idempotency_keys` table with primary key `(user_id, key)`, `command_type`, `request_hash`, and a stored `result` snapshot. The key is generated by the client per message submission. The row is inserted in the same database transaction as the mutation (insert with conflict handling), so a row exists only if the mutation committed. Concurrent duplicate requests wait on the unique index and then receive the stored result. The same key with a different `request_hash` is rejected. A clarification answer is a new submission with a new key. The key retention policy is decided at schema implementation.

---

## 17. User Data Isolation

Every user-owned financial entity must be isolated by user identity.

At minimum:

- repositories require `user_id`
- queries scope records to the authenticated user
- mutations verify ownership
- relationships must not allow cross-user access
- tests verify isolation

PostgreSQL Row Level Security may be used as defense-in-depth, not as a replacement for application authorization.

Enforcement for the MVP:

- the authenticated `userId` comes from the server-side session only, never from the request body or AI output
- repository scoping on every query
- composite foreign keys `(child_fk, user_id) → parent(id, user_id)` so the database rejects cross-user references
- isolation tests (cross-user read, mutation, and foreign-key insert must fail)

Row Level Security is **deferred from the MVP**. It can be added later without a schema change (database role and policies only).

---

## 18. Dashboard State

The dashboard uses authoritative backend state. The client must not independently calculate authoritative balances, net worth, investment values, or transaction totals.

After successful mutation, return or revalidate the latest backend state.

Initial MVP does not require WebSockets. Use request/response revalidation first.

---

## 19. Authentication

**Better Auth** (exact version pinned) is the final choice. Details and rejected alternatives: ADR-003.

- email + password
- database sessions in PostgreSQL (session cookie cache is not enabled, so revocation is immediate)
- user IDs are PostgreSQL `uuid`
- all authentication code lives in `infrastructure/auth`; application and domain code only know `userId`
- authorization is checked in the application layer on every operation, not only in routing or proxy layers
- tables: `users`, `sessions`, `accounts`, `verifications`, and Better Auth's rate-limit table (rate-limit storage: database)
- Drizzle Kit is the only migration tool; Better Auth's migration CLI is not used; its schema generator is a reference only
- not enabled in the MVP: email verification, OAuth, MFA, account deletion, email change, plugins, stateless sessions
- registration form: email and password only; `name` (required by Better Auth) is derived from the email local part and is never used by domain logic

---

## 20. Testing Strategy

### Unit

Test financial calculations, transaction semantics, net worth, balance changes, validation, parser normalization, and asset resolution.

### Property-based

Use `fast-check` where useful for invariants such as transfer not changing net worth, balance consistency, and reversal behavior.

### Integration

Use real PostgreSQL for transactions, rollback, locking, concurrency, idempotency, user isolation, and constraints.

### E2E

Use Playwright for critical flows:

```text
login → create asset → chat transaction → confirmation/clarification → mutation → dashboard → history
```

Tests required by ADR-002 and ADR-003:

- user isolation (cross-user read, mutation, and composite-FK insert)
- concurrency on the same asset and idempotent duplicate submissions (real PostgreSQL)
- atomic rollback of void + replacement
- immutability: repositories expose no update or delete path for ledger and audit tables
- Better Auth UUID gate: `users.id`, `sessions.user_id`, and `accounts.user_id` are `uuid`; the password hash is stored in `accounts`; email is stored lowercase and unique

---

## 21. Error Handling

Financial errors include invalid amount, missing/ambiguous asset, insufficient balance where applicable, unauthorized access, concurrency conflict, database failure, AI parsing failure, and unsupported intent.

Never return a successful financial response when the mutation failed. Internal technical details must not be exposed to end users.

---

## 22. Dependency Policy

Before adding a dependency, evaluate whether the framework already provides the capability, whether it materially reduces complexity, maintenance/security status, vendor lock-in, financial correctness impact, and reversibility.

Avoid libraries added only for convenience.

---

## 23. Deployment Strategy

Preferred MVP shape:

```text
Next.js application + Managed PostgreSQL
```

Example deployment: Vercel + Neon.

Alternative: Docker + VPS + PostgreSQL.

Deployment provider is not part of the financial architecture.

---

## 24. Performance Target

Target normal end-to-end chat-to-dashboard processing at approximately **< 2 seconds**, where external AI latency permits.

Performance optimization must not weaken validation, atomicity, user isolation, or financial correctness.

---

## 25. Security Principles

Required:

- authenticated access
- authorization for every user-owned resource
- server-side financial validation
- database constraints
- parameterized/ORM queries
- secrets only through environment variables
- no API keys in client bundles
- no direct client access to financial mutation logic
- auditable financial mutations
- safe error responses
- all AI output treated as untrusted input

---

## 26. Architecture Change Policy

An explicit architecture decision is required for changes to the database technology, ORM/data-access strategy, application framework, AI-provider abstraction, financial-engine boundary, transaction persistence model, authentication architecture, user-isolation architecture, money representation, or multi-currency support.

Significant decisions belong in `docs/architecture_decisions/`.

---

## 27. Current Non-Goals

Not required for the initial implementation:

- microservices
- separate frontend/backend repositories
- WebSockets
- event sourcing
- Kubernetes
- multi-region deployment
- multi-currency accounting
- MFA
- advanced investment portfolio analytics
- automatic bank synchronization
- complex autonomous AI agents

Do not introduce these unless product requirements justify them.

---

## 28. Final Technical Direction

```text
Next.js + TypeScript
        ↓
Application Layer
        ↓
Deterministic Financial Domain
        ↓
Drizzle ORM
        ↓
PostgreSQL
```

AI is an external interpretation service:

```text
AI Provider(s)
        ↓
Provider Adapter
        ↓
Structured Intent
        ↓
Zod
        ↓
Application Validation
        ↓
Financial Engine
```

The AI provider is replaceable. The financial engine is not dependent on the AI provider. The database is the authoritative persistence layer, and the application/domain layer is the authoritative financial logic.

**Core boundary:** AI interprets. Application validates. Domain calculates. Database persists.