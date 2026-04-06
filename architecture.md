# Metroflow ERP: Architectural Overview

This document outlines the architectural structure of the Metroflow ERP system, addressing modularity, data flow, and "Vibe Coding Safety".

---

## 1. Service Layer & Separation of Responsibilities

### Current State: **Service-Oriented Architecture**
The system uses a multi-layered approach to isolate business logic from infrastructure:

- **UI Layer**: React components that exclusively handle user interaction.
- **Context Layer (`src/contexts`)**: Acts as a reactive state distributor. It consumes services to perform actions and manages global state updates.
- **Service Layer (`src/services`)**: The "Brain" of the system.
  - **Domain Services**: Isolated files (e.g., `comercialService.ts`, `tecnicoService.ts`) contain all business logic, calculations, and data transformations.
  - **Validation**: Every service uses **Zod Schemas** (`src/schemas.ts`) to validate data *before* it reaches the API and *after* it returns from the server.
- **Infrastructure Layer (`apiClient.ts`)**: A centralized fetch wrapper that handles HTTP communication, JSON sanitization, and global error handling.

### Guidelines for New Features:
> [!IMPORTANT]
> When adding a new feature (e.g., "Módulo de Qualidade"):
> 1. Define the data shape in `src/types.ts`.
> 2. Create a Zod schema in `src/schemas.ts`.
> 3. Implement the business logic in `src/services/qualidadeService.ts`.
> 4. Consume the service in `DataContext.tsx` or a specialized context.

---

## 2. Module Organization (Modular Monolith)

### Structure: **Domain Isolation**
The project is organized into independent domains:
- **Comercial**: Clients, Quotes.
- **Técnico**: Service Orders, Instruments, Calibration.
- **Logística**: Fleet, Custody.
- **Financeiro**: NF-e, Payments, Commissions.

### Error Resiliency:
- **Optimistic UI**: The system uses an optimistic update pattern in `DataContext.tsx`. UI changes are reflected immediately, with automatic rollbacks if the background service call fails.
- **Fault Isolation**: Domain-specific services ensure that a failure in one logic block (e.g., a calculation error in Finance) does not prevent other modules from operating.

---

## 3. Data Integrity & Safety (Vibe Coding Safety)

To ensure AI-driven refactoring or new code doesn't degrade the system's "Rules of Gold":
1. **Schema Enforcement**: Never bypass Zod validation in services.
2. **Type Strictness**: Avoid the `any` type. Use the interfaces defined in `src/types.ts`.
3. **Synchronicity**: For secondary actions (like sending emails), use the background service pattern to avoid blocking the user flow.
