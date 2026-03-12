# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

`@pawells/rxjs-events` is a TypeScript library published to npm that provides RxJS-based event handling with reactive observables and async event streams. It targets ES2022, is distributed as ESM, and has a single runtime dependency on `rxjs`. The library exports from a single entry point (`src/index.ts`).

## Commands

```bash
yarn build            # Compile TypeScript → ./build/
yarn dev              # Build and run (tsc && node build/index.js)
yarn watch            # TypeScript watch mode
yarn typecheck        # Type check without emitting
yarn lint             # ESLint src/
yarn lint:fix         # ESLint with auto-fix
yarn test             # Run Vitest tests
yarn test:ui          # Open interactive Vitest UI in a browser
yarn test:coverage    # Run tests with coverage report (80% threshold)
yarn start            # Run built output
```

To run a single test file: `yarn vitest run src/path/to/file.spec.ts`

## Architecture

All source lives under `src/` and is compiled to `./build/` by `tsc`.

**Entry point** (`src/index.ts`): The single public export surface. All types, utilities, and classes intended for consumers must be re-exported from this file.

### Core modules

| File | Export | Description |
|------|--------|-------------|
| `src/handler.ts` | `EventHandler<TObject, TEvent>` | Main event handler class wrapping an RxJS `Subject`. Manages subscriptions by numeric ID, supports `Trigger`, `Subscribe`, `Unsubscribe`, `Destroy`, and async iteration via `GetAsyncIterableIterator` / `GetAsyncIterator`. |
| `src/async-observable.ts` | `AsyncObservable<T>`, `BackpressureStrategy`, `IBackpressureConfig`, `BufferOverflowError` | `Observable` subclass with a push buffer and configurable backpressure (DropOldest / DropNewest / Error). Implements `Symbol.asyncIterator` returning an `IAsyncGeneratorESN`. |
| `src/event-filter.ts` | `EventFilter` | Utility function that filters a single-key event object against an `IFilterCriteria` map using strict equality. |
| `src/filter-criteria.ts` | `IFilterCriteria` | Index-signature interface `{ [key: string]: unknown }` used as filter argument type. |
| `src/event-data.ts` | `TEventData` | Base type alias (`Record<string, unknown>`) for all event shapes. Events must have exactly one top-level key naming the event type. |
| `src/event-function.ts` | `TEventFunction<TEvent>` | Handler callback type: `(data: TEvent) => Promise<void> \| void`. |
| `src/extract-event-payload.ts` | `TExtractEventPayload<TEvent>` | Utility type that extracts the payload type from a `TEventData` object (`TEvent[keyof TEvent]`). |
| `src/async-generator-esn.ts` | `IAsyncGeneratorESN<T, TReturn, TNext>` | Extends `AsyncGenerator` with `Symbol.asyncDispose` for TC39 Explicit Resource Management (`await using`). |
| `src/types.ts` | `TEventHandler`, `TEventFilter`, `TAsyncObserver`, `TUnsubscribe`, `ISubscriptionOptions` | Supplemental callback and options types. |

### Mocks module (`src/mocks/`)

A dedicated test-helper package with its own entry point at `src/mocks/index.ts`. Import from `src/mocks/index.js` in tests. **Do not re-export from `src/index.ts`** — mocks are dev-only and must not leak into the published library.

| File | Key Exports | Description |
|------|-------------|-------------|
| `src/mocks/mock-handler.ts` | `MockEventHandler` | Controllable mock of `EventHandler` with spy capabilities for asserting triggers and subscriptions in tests. |
| `src/mocks/mock-observable.ts` | `MockAsyncObservable` | Controllable mock of `AsyncObservable` exposing push/complete/error helpers for controlled test emission. |
| `src/mocks/constants.ts` | `MOCK_USER_NAMES`, `MOCK_MESSAGE_CONTENT`, `MOCK_EVENT_TYPES`, `DEFAULT_MOCK_CONFIG`, … | Static seed data arrays used by generators. |
| `src/mocks/types.ts` | `IMockConfig`, `IMockEventData` | Configuration and data-shape interfaces for the mock layer. |
| `src/mocks/generate-user-events.ts` | `GenerateUserEvents` | Factory that produces typed user-event objects from seed data. |
| `src/mocks/generate-message-events.ts` | `GenerateMessageEvents` | Factory for message-event objects. |
| `src/mocks/generate-event-data.ts` | `GenerateEventData` | Generic event-data factory. |
| `src/mocks/generate-filter-criteria.ts` | `GenerateFilterCriteria` | Produces `IFilterCriteria` maps for filter tests. |
| `src/mocks/generate-custom-fields.ts` | `GenerateCustomFields` | Generates arbitrary extra fields for event payloads. |
| `src/mocks/generate-subscription-scenarios.ts` | `GenerateSubscriptionScenarios` | Generates multi-subscription test scenarios. |
| `src/mocks/matcher-to-have-subscribers.ts` | `ToHaveSubscribers` | Vitest custom matcher: asserts a handler has N active subscribers. |
| `src/mocks/matcher-to-have-triggered-event.ts` | `ToHaveTriggeredEvent` | Vitest custom matcher: asserts a mock handler triggered a specific event. |
| `src/mocks/matcher-to-match-event-filter.ts` | `ToMatchEventFilter` | Vitest custom matcher: asserts an event object matches a filter criteria map. |
| `src/mocks/matchers-setup.ts` | `SetupMatchers` | Registers all custom Vitest matchers in one call (call from `vitest.setup.ts`). |

### Event shape convention

An event object must have **exactly one top-level key** whose name is the event type and whose value is the payload:

```typescript
interface UserCreatedEvent extends TEventData {
  UserCreated: { userId: string; username: string };
}
```

`EventHandler` wraps triggered data automatically: `handler.Trigger(data)` emits `{ [handler.Name]: data }`.

### EventHandler subscription IDs

`Subscribe` returns a `number` ID. IDs are recycled via an internal `Set<number>` (`_AvailableIds`) so allocation is O(1). Pass the ID to `Unsubscribe` to remove the subscription.

## Key Patterns

**Adding a new export**: implement in `src/`, export from `src/index.ts`.

**No additional runtime dependencies**: Keep `dependencies` limited to `rxjs`. All tooling belongs in `devDependencies`.

**ESM only**: The package is `"type": "module"`. Use ESM import/export syntax throughout; avoid CommonJS patterns. Internal imports must use `.js` extensions.

## TypeScript Configuration

Project uses a 4-config split:

- **`tsconfig.json`** — Base/development configuration used by Vitest and editors. Includes all source files for full type checking.
- **`tsconfig.build.json`** — Production build configuration that extends `tsconfig.json`, explicitly excludes test files (`src/**/*.spec.ts`), and is used only by the build script.
- **`tsconfig.test.json`** — Vitest test configuration.
- **`tsconfig.eslint.json`** — ESLint type-aware linting configuration.

General configuration: Requires Node.js >= 22.0.0. Outputs to `./build/`, targets ES2022, module resolution `bundler`. Declaration files (`.d.ts`) and source maps are emitted alongside JS. Strict mode is fully enabled (`strict`, `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`).

## CI/CD

Single workflow (`.github/workflows/ci.yml`) triggered on push to `main`, PRs to `main`, and `v*` tags. CI jobs run on Node 24.x (`ubuntu-latest`) with minimum support for Node >= 22.0.0:

- **`validate`** (typecheck + lint) and **`test`** run in parallel on every push/PR.
- **`build`** runs after both pass, only on non-tag pushes.
- **`publish`** runs after both pass on `v*` tags: builds, publishes to npm with provenance, and creates a GitHub Release.
