# Fintry Project Overview

## 1. What Is Fintry?

Fintry adalah personal financial and multi-asset tracking application
berbasis natural-language chat.

Tujuan utama Fintry adalah membuat pencatatan keuangan menjadi cepat dan
minim friction. Pengguna dapat mengetik pemasukan, pengeluaran, transfer
antar-aset, dan instruksi terkait investasi menggunakan bahasa natural.

Fintry menyatukan bank account, e-wallet, dan investment asset ke dalam
satu financial dashboard untuk memberikan helicopter view terhadap net
worth.

## 2. Core Interaction

Alur utama:

`User → Chat → AI Parser → Structured Intent → Validator → Financial Engine → Database → Dashboard + Chat Response`

Chat adalah primary entry point.

## 3. Mandatory Features

### Authentication

-   registration
-   login
-   user session
-   user data isolation

### Asset Management

-   create asset
-   edit asset
-   deactivate asset (hanya saat saldo 0; tanpa reactivation pada MVP)
-   opening balance
-   bank
-   e-wallet
-   investment

### Transaction

-   income
-   expense
-   transfer
-   transaction history
-   transaction detail
-   edit/correction
-   reversal/undo

### AI Input

-   natural-language parsing
-   amount extraction
-   asset extraction
-   transaction type detection
-   date extraction
-   description extraction
-   category suggestion
-   ambiguity handling
-   clarification

### Financial Engine

-   balance calculation
-   net worth calculation
-   transfer accounting
-   investment valuation (P1 menurut PRD §23; aturan domain tetap berlaku)
-   balance adjustment
-   atomic mutation

### Dashboard

-   net worth
-   asset allocation
-   asset list
-   income summary
-   expense summary
-   recent transactions

## 4. Product Principles

1.  Chat-first.
2.  Zero-friction entry.
3.  Financial calculations are deterministic.
4.  AI is an interpreter, not the financial authority.
5.  User data is isolated.
6.  Ambiguous financial instructions require clarification.
7.  Every financial mutation must be traceable.

## 5. Out of Scope

The AI agent MUST NOT implement these unless explicitly requested and
the scope documents are updated:

-   automatic bank synchronization
-   payment gateway/payment processing
-   automatic stock trading
-   broker order execution
-   financial advisory
-   credit scoring
-   loan management
-   full accounting ERP
-   cryptocurrency exchange/trading
-   automatic market execution
-   unrelated social features
-   unrelated collaboration features
-   asset reactivation
-   category management UI, rename, merge, delete (P1)
-   deletion akun finansial (hanya deletion akun pengguna email yang diterapkan)

## 6. Product Boundary

Fintry records and manages the user's financial state.

Fintry MVP does not directly move real money.

A transaction in Fintry is a record/update of financial state, not a
payment execution.

## 7. Source of Truth

Product behavior:

`PRD.md`

Financial behavior:

`domain_rules.md`

Technical architecture:

`tech_stack.md`

AI agent behavior:

`rules.md`

Current implementation status:

`progress.md`

Product concept and brand direction:

`README.md`

## 8. Change Policy

If an implementation request conflicts with the documents above:

1.  Do not silently reinterpret the requirement.
2.  Identify the conflict.
3.  Prefer the higher-priority source of truth.
4.  Ask for explicit approval when the requested change modifies product
    scope or financial domain rules.