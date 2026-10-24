# Fintry AI Agent Instructions

## 1. Purpose

This file is the entry point for AI coding agents working on the Fintry project.

Before making changes, the agent must understand the relevant project documentation and current implementation state. These documents are the project's source of truth.

Do not silently change product scope, financial rules, architecture, or technical decisions.

---

## 2. Documentation Source of Truth

The project documentation is located in `docs/`.

### Core documents

- `docs/rules.md`
  - AI working behavior
  - coding and response rules
  - modification and testing rules

- `docs/project_overview.md`
  - project scope
  - mandatory features
  - out-of-scope features
  - product principles

- `docs/PRD.md`
  - product requirements
  - user flows
  - functional requirements
  - acceptance criteria

- `docs/domain_rules.md`
  - deterministic financial rules
  - transaction semantics
  - balance and net-worth rules
  - financial safety constraints

- `docs/tech_stack.md`
  - technology choices
  - architecture
  - directory structure
  - coding conventions
  - infrastructure constraints

- `docs/progress.md`
  - current implementation state
  - completed work
  - current focus
  - known issues
  - pending tasks
  - important project decisions

- `README.md`
  - high-level project/product context

### Architecture decision records

Located in `docs/architecture_decisions/`:

- `ADR-001.md`: core architecture and provider-agnostic AI boundary
- `ADR-002.md`: persistence model and database connection
- `ADR-003.md`: authentication

---

## 3. Required Reading Behavior

Do not blindly read every document for every small task.

Read documentation according to the task.

### Always read

Before any meaningful development task:

1. `docs/rules.md`
2. `docs/progress.md`

### Feature implementation

Also read:

- `docs/PRD.md`
- `docs/project_overview.md`

### Financial feature

For anything involving money, transactions, balances, assets, investments, categories, net worth, or financial calculations, always read:

- `docs/PRD.md`
- `docs/domain_rules.md`

Relevant examples:

- income
- expense
- transfer
- investment purchase
- investment valuation
- opening balance
- balance adjustment
- transaction correction
- transaction reversal
- net worth
- asset balance

### Database or persistence

Also read:

- `docs/tech_stack.md`
- `docs/domain_rules.md`
- `docs/architecture_decisions/ADR-002.md`

### Authentication, session, or user identity

Also read:

- `docs/tech_stack.md`
- `docs/architecture_decisions/ADR-003.md`

### Architecture or major refactor

Also read:

- `docs/tech_stack.md`
- `docs/PRD.md`
- `docs/project_overview.md`

Check the architecture decision records in:

`docs/architecture_decisions/`

if the change affects an existing architectural decision.

### UI/UX work

Also read:

- `docs/PRD.md`
- `docs/project_overview.md`
- `docs/tech_stack.md`

### AI / parser / chat behavior

Also read:

- `docs/PRD.md`
- `docs/domain_rules.md`
- `docs/tech_stack.md`

---

## 4. Required Workflow

Before modifying code:

1. Read the relevant documentation.
2. Read `docs/progress.md`.
3. Inspect the existing implementation.
4. Identify the files and modules affected.
5. Check whether the requested change conflicts with existing requirements or domain rules.
6. Implement the smallest correct change.
7. Run relevant tests, type checks, linting, or validation.
8. Update documentation if the implementation changes an established decision or behavior.
9. Update `docs/progress.md` when the task materially changes project state.

Do not start coding based only on the user's latest sentence when project documentation provides additional constraints.

---

## 5. Financial Safety Boundary

Fintry's financial state must be controlled by deterministic application/domain logic.

The AI/LLM may:

- interpret natural-language input
- extract structured information
- classify transaction intent
- normalize dates and amounts
- identify missing information
- request clarification
- explain the result to the user

The AI/LLM must NOT:

- directly mutate financial state
- directly execute raw SQL for financial mutations
- decide financial calculations as an authoritative source
- bypass validation
- bypass transaction atomicity
- fabricate a successful mutation
- infer an ambiguous asset without sufficient evidence

The intended flow is:

`User → Chat → AI Parser → Structured Intent → Validator → Financial Engine → Database → Dashboard + Chat Response`

Financial calculations and mutations belong to deterministic application/domain logic.

---

## 6. Important Financial Invariants

Unless explicitly changed through an approved project decision, preserve these rules:

- Income increases an asset and net worth.
- Expense decreases an asset and net worth.
- Transfer decreases the source asset and increases the destination asset.
- Transfer does not change net worth.
- Investment purchase is a transfer from a cash asset to an investment asset, not an expense.
- Investment valuation changes asset value and net worth but is not a cashflow transaction.
- Opening balance is not income.
- Balance adjustment is reconciliation, not automatically income or expense.
- Description and category are separate concepts.
- Ambiguous asset resolution requires clarification.
- Financial mutations must be atomic.
- Failed mutations must not produce success responses.
- User financial data must remain isolated.
- Asset values never become negative; operations that would make them negative are rejected.
- Asset adjustments (opening balance, balance adjustment, valuation) are append-only.
- Reversal is a void (status change), never a physical delete; `VOIDED` transactions are not edited.
- Inactive assets are not used for new transactions; assets with a non-zero value cannot be deactivated.

If implementation requirements conflict with these rules, stop and identify the conflict instead of silently overriding them.

---

## 7. Scope Discipline

Do not add features simply because they seem useful.

Before implementing a feature, check:

1. Is it required by the PRD?
2. Is it inside the project scope?
3. Is it compatible with the domain rules?
4. Is it already planned in `progress.md`?
5. Does it require an architecture decision?

If the answer is unclear, state the uncertainty and ask for a decision when necessary.

Do not expand MVP scope without explicit approval.

---
## 8. Task Size and Execution Discipline

AI agents must keep implementation tasks focused and appropriately sized.

### One Prompt = One Primary Outcome

Each implementation prompt should have one primary outcome.

Do not combine multiple independent implementation phases into one task.

Examples of separate phases:

- environment/setup
- dependency installation
- database connection
- authentication
- database schema
- migrations
- repositories
- domain logic
- application services
- UI
- tests
- deployment

These should normally be handled as separate checkpoints.

### Task size limits

- Large task: one primary task/outcome only.
- Small task: maximum 2–4 closely related actions.
- Do not add unrelated cleanup, refactoring, or feature work.
- Do not continue automatically into the next project phase after completing the requested task.
- Stop at the requested checkpoint and report the result.

The goal is to minimize unnecessary context usage, reduce implementation risk, and keep
each checkpoint easy to verify or resume with another agent.

### Completion checkpoint

After the requested task is complete:

1. verify the implementation;
2. run only the relevant checks;
3. report what changed;
4. report validation results;
5. report any blocker or decision;
6. stop and wait for the next task.

Do not proactively implement the next milestone unless explicitly requested.

## 9. Environment, Installation, and Configuration Tasks

AI agents must distinguish between actions they can perform in the development environment
and actions that require the human operator.

Not every AI coding agent has access to the user's local machine, browser, operating system,
database server, credentials, hosting account, or external services.

### When a task requires user-side action

If installation, configuration, authentication, account setup, database setup, environment
variables, hosting configuration, or another external/manual action is required:

1. Identify exactly what must be done.
2. Explain why it is required in one short sentence when useful.
3. Give the exact command, path, setting, or UI action.
4. Tell the user where the command/action must be performed.
5. Tell the user what successful output/state to expect.
6. Ask the user to perform the step.
7. Wait for the user to report the result before continuing.

Do not assume the action was completed.

Do not claim success for an operation that the agent could not actually verify.

### Step-by-step operational guidance

For environment/setup tasks, prefer a sequential workflow:

```text
Prerequisite check
→ installation
→ configuration
→ environment variables
→ verification
→ implementation
→ tests
```

## 10. Architecture Changes

Do not silently introduce major architectural changes.

Examples:

- changing database technology
- changing backend framework
- changing frontend framework
- changing authentication architecture
- changing AI provider architecture
- changing financial transaction architecture
- introducing a new infrastructure dependency
- changing the LLM-to-financial-engine boundary

For significant architectural decisions:

1. Explain the reason.
2. Explain the alternatives considered.
3. Explain the impact.
4. Get approval when the decision is not already documented.
5. Record the decision in `docs/architecture_decisions/`.

---

## 11. Code Quality

Prefer:

- simple and explicit code
- strong typing where supported
- small cohesive modules
- deterministic business logic
- reusable validation
- clear error handling
- testable financial calculations
- database integrity constraints
- minimal unnecessary dependencies

Avoid:

- duplicated business rules
- hidden side effects
- magic financial calculations
- unnecessary abstractions
- premature optimization
- dead code
- placeholder implementations
- `TODO` markers as a substitute for implementation

Do not leave incomplete code while claiming a feature is complete.

---

## 12. Code Reuse and Duplication

Prefer a clean single source of truth.

Before creating new code, inspect the existing implementation for reusable logic,
types, validators, utilities, constants, repositories, and components.

Avoid:

- copy-pasted business logic;
- duplicated validation rules;
- duplicated parsing or normalization logic;
- duplicated constants or configuration;
- duplicated database access patterns;
- multiple implementations of the same domain rule;
- creating a new helper when an existing helper already fits.

When the same behavior is required in multiple places, prefer one authoritative
implementation in an appropriate shared module.

However, do not apply DRY mechanically.

Do not create abstractions merely to eliminate a few repeated lines when the abstraction
would make the code harder to understand.

Prefer:

- one authoritative implementation;
- small cohesive reusable functions;
- clear module ownership;
- explicit dependencies;
- composition over unnecessary abstraction;
- simple code over clever code.

## 13. Testing Requirements

Financial logic requires tests.

When changing financial behavior, test at minimum:

- normal valid case
- boundary cases
- invalid input
- ambiguous input
- insufficient balance where applicable
- atomicity / rollback behavior
- resulting balance
- resulting net worth
- relevant transaction records

When changing the AI parser, test:

- valid structured intent
- missing required fields
- ambiguous entities
- date normalization
- amount normalization
- unsupported intent
- invalid structured output

Prefer deterministic tests for domain logic instead of relying on an LLM to verify financial correctness.

---

## 14. Progress Tracking

`docs/progress.md` is the project's current-state memory.

After meaningful implementation work, update it with:

- completed work
- current focus
- important decisions
- known issues
- next tasks

Keep it concise.

Do not turn `progress.md` into a detailed historical changelog.

Permanent architectural decisions belong in:

`docs/architecture_decisions/`

not only in `progress.md`.

---

## 15. Scope-Controlled Refactoring

Do not perform unrelated refactoring while implementing a requested task.

Refactoring is allowed when:

1. it is required for the requested implementation;
2. it fixes a correctness or safety problem directly related to the task; or
3. the user explicitly requests the refactoring.

If unrelated technical debt or improvement opportunities are discovered:

- do not implement them automatically;
- report them briefly as follow-up items;
- continue only with the requested task.

Do not turn a focused implementation task into a general codebase cleanup.

## 16. Response Format for AI Agents

Responses should be concise and action-oriented.

For implementation tasks, report:

1. What was changed.
2. What was tested/validated.
3. Any important issue or decision requiring attention.

Do not repeat the entire project context after every task.

Do not provide unnecessary greetings or filler.

When code is requested, provide complete implementation rather than pseudo-code or partial snippets.

---

## 17. Completion Rule

A task is not considered complete merely because code was written.

Before declaring completion:

- verify the implementation
- run relevant checks
- confirm financial invariants are preserved
- confirm scope is respected
- update relevant documentation
- update `docs/progress.md` when appropriate

If something could not be verified, explicitly state what remains unverified.

---

## 18. Documentation Hierarchy

When documents appear to conflict, use this hierarchy:

1. Explicit user decision in the current task
2. `docs/domain_rules.md` for financial-domain behavior
3. `docs/PRD.md` for product requirements
4. `docs/tech_stack.md` for technical constraints
5. `docs/project_overview.md` for scope
6. `docs/rules.md` for agent working behavior
7. `docs/progress.md` for current implementation state
8. `README.md` for high-level context

If a conflict cannot be resolved safely, do not guess. Report the conflict and request a decision.

This section is the single authority for resolving document conflicts. `docs/rules.md` section 3 defers to it.

Conflicts resolved on 2026-10-08 using this hierarchy are recorded in `docs/progress.md` ("Resolved Documentation Conflicts").

---

## 19. First Task in a New Session

When starting a new development session:

1. Read this `AGENTS.md`.
2. Read `docs/rules.md`.
3. Read `docs/progress.md`.
4. Read only the additional documents relevant to the requested task.
5. Inspect the current implementation before making changes.

This keeps context usage efficient while ensuring that project constraints are respected.