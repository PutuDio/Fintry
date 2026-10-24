# Fintry AI Development Rules

## 1. Response Style

- Respond directly to the technical task.
- Do not add unnecessary greetings.
- Do not add unnecessary closing statements.
- Do not repeat concepts already established in the conversation.
- Prefer concise explanations.
- Explain implementation decisions only when they matter.
- Prefer actionable instructions over long theoretical explanations.
- When the user must perform an action manually, provide the exact next step rather than
  a large list of future steps.

---

## 2. Context First

Before changing code:

1. Inspect the relevant existing files.
2. Read the applicable project documentation.
3. Check `progress.md`.
4. Identify existing implementation patterns.
5. Check existing dependencies and tooling when relevant.
6. Avoid creating duplicate abstractions.
7. Identify the smallest correct change that satisfies the task.

Do not assume a file, module, dependency, database, service, or architecture exists
without checking.

Do not start implementation based only on the latest user sentence when project
documentation provides additional constraints.

---

## 3. Source of Truth Hierarchy

The single authoritative hierarchy for resolving document conflicts is defined by
`AGENTS.md`.

Use this order:

1. Explicit user decision in the current task.
2. `domain_rules.md` for financial domain behavior.
3. `PRD.md` for product requirements.
4. `tech_stack.md` for technical constraints.
5. `project_overview.md` for scope boundaries.
6. `rules.md` for AI working behavior.
7. `progress.md` for current implementation state.
8. `README.md` for product concept and brand context.

`rules.md` governs how the AI works. It does not override product, domain, or
architecture decisions.

If two documents conflict:

- do not silently choose a new interpretation;
- identify the conflict;
- use the documented hierarchy;
- request an explicit decision when the conflict cannot be resolved safely.

---

## 4. Task Size and Execution Discipline

AI agents must keep implementation tasks focused and appropriately sized.

### One Prompt = One Primary Outcome

Each implementation prompt should have one primary outcome.

Do not combine multiple independent implementation phases into one task.

Typical independent phases include:

- environment setup;
- dependency installation;
- database connection;
- authentication;
- database schema;
- migrations;
- repositories;
- domain logic;
- application services;
- AI/parser implementation;
- UI;
- testing;
- deployment.

These should normally be handled as separate checkpoints.

### Task size limits

For normal project work:

- Large task: one primary task/outcome only.
- Small task: maximum 2–4 closely related actions.
- Do not combine unrelated implementation phases.
- Do not add unrelated cleanup or refactoring.
- Do not implement the next project phase automatically.

If a task is too large to fit into one focused checkpoint:

1. identify the logical milestones;
2. split the work into sequential tasks;
3. complete one milestone at a time;
4. verify each milestone before continuing.

### Completion checkpoint

After completing the requested task:

1. verify the implementation;
2. run only the relevant checks;
3. report what changed;
4. report validation results;
5. report blockers or decisions requiring attention;
6. stop and wait for the next task.

Do not proactively continue into another implementation phase unless explicitly requested.

The goal is to reduce unnecessary context usage, reduce implementation risk, and make
the project easy to resume with another AI agent.

---

## 5. Environment and Agent Capability Awareness

Do not assume that every AI agent has the same capabilities.

An AI agent may have:

- terminal access;
- filesystem access;
- browser access;
- database access;
- external service access;

or it may have none of these.

The agent may also lack:

- operating-system permissions;
- credentials;
- API keys;
- database credentials;
- access to the user's browser;
- access to external accounts;
- ability to install system software.

Before claiming that an environment operation succeeded, the agent must have actually
performed or verified that operation.

Never fabricate:

- command output;
- installed software;
- database state;
- configuration state;
- authentication state;
- deployment state;
- test results;
- file changes.

If the required capability is unavailable, switch to user-guided execution.

---

## 6. Installation, Configuration, and User-Guided Execution

Installation and configuration tasks require special handling because the AI agent may
not have access to the user's local machine or external accounts.

### General procedure

For installation/configuration tasks, use this sequence:

```text
Prerequisite check
→ installation
→ configuration
→ environment variables
→ verification
→ implementation
→ tests
```s