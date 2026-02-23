# RxJS Events

[![npm](https://img.shields.io/npm/v/@pawells/rxjs-events)](https://www.npmjs.com/package/@pawells/rxjs-events)
[![GitHub Release](https://img.shields.io/github/v/release/PhillipAWells/rxjs-events)](https://github.com/PhillipAWells/rxjs-events/releases)
[![CI](https://github.com/PhillipAWells/rxjs-events/actions/workflows/ci.yml/badge.svg)](https://github.com/PhillipAWells/rxjs-events/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D24-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/PhillipAWells?style=social)](https://github.com/sponsors/PhillipAWells)

RxJS-based event handling library with reactive observables and async event streams. Supports subscription management, backpressure-aware async iteration, and TC39 Explicit Resource Management (`await using`).

## Installation

```bash
npm install @pawells/rxjs-events
# or
yarn add @pawells/rxjs-events
```

## Usage

### Defining an event shape

Events must have **exactly one top-level key** whose name is the event type and whose value is the payload:

```typescript
import type { TEventData } from '@pawells/rxjs-events';

interface UserCreatedEvent extends TEventData {
  UserCreated: { userId: string; username: string };
}
```

### EventHandler — subscribe, trigger, and unsubscribe

```typescript
import { EventHandler } from '@pawells/rxjs-events';

const handler = new EventHandler<{ UserCreated: { userId: string; username: string } }, 'UserCreated'>('UserCreated');

// Subscribe — returns a numeric ID
const id = handler.Subscribe((payload) => {
  console.log('New user:', payload.userId);
});

// Trigger the event
handler.Trigger({ userId: '42', username: 'alice' });

// Unsubscribe by ID
handler.Unsubscribe(id);

// Destroy — completes the underlying Subject and removes all subscriptions
handler.Destroy();
```

### Async iteration with `GetAsyncIterableIterator`

```typescript
const handler = new EventHandler<{ MessageReceived: { text: string } }, 'MessageReceived'>('MessageReceived');

async function processMessages() {
  for await (const payload of handler.GetAsyncIterableIterator()) {
    console.log('Message:', payload.text);
  }
}
```

### Explicit Resource Management (`await using`)

`EventHandler` exposes `GetAsyncIterator()`, which returns an `IAsyncGeneratorESN` implementing `Symbol.asyncDispose`:

```typescript
async function processOnce() {
  await using iter = handler.GetAsyncIterator();
  const { value, done } = await iter.next();
  if (!done) console.log(value);
  // iter is automatically disposed at block exit
}
```

### AsyncObservable with backpressure

`AsyncObservable` is an `Observable` subclass with a push buffer and configurable overflow handling:

```typescript
import { AsyncObservable, BackpressureStrategy } from '@pawells/rxjs-events';

const obs = new AsyncObservable<string>({
  bufferSize: 100,
  strategy: BackpressureStrategy.DropOldest,
});

for await (const item of obs) {
  console.log(item);
}
```

### Filtering events

```typescript
import { EventFilter } from '@pawells/rxjs-events';
import type { IFilterCriteria } from '@pawells/rxjs-events';

const criteria: IFilterCriteria = { userId: '42' };
const event = { UserCreated: { userId: '42', username: 'alice' } };

if (EventFilter(event, criteria)) {
  // event matches all criteria
}
```

## API

### `EventHandler<TObject, TEvent>`

Main event handler class wrapping an RxJS `Subject`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `constructor` | `(name: TEvent)` | Creates a handler with the given event name |
| `Name` | `string` (getter) | Returns the event name |
| `Subscribe` | `(handler: TEventFunction<TObject[TEvent]>, options?: ISubscriptionOptions) => number` | Subscribes and returns a numeric ID |
| `Unsubscribe` | `(id: number) => void` | Removes subscription by ID |
| `Trigger` | `(data: TObject[TEvent]) => void` | Emits the event with the given payload |
| `Destroy` | `() => void` | Completes the Subject and cleans up all subscriptions |
| `GetAsyncIterableIterator` | `() => AsyncIterableIterator<TObject[TEvent]>` | Returns an async iterable iterator |
| `GetAsyncIterator` | `() => IAsyncGeneratorESN<TObject[TEvent]>` | Returns a disposable async generator |

Subscription IDs are recycled internally — allocation is O(1).

### `AsyncObservable<T>`

An `Observable` subclass with a push buffer and configurable backpressure. Implements `Symbol.asyncIterator`.

| Option | Type | Description |
|--------|------|-------------|
| `bufferSize` | `number` | Maximum number of buffered items |
| `strategy` | `BackpressureStrategy` | `DropOldest`, `DropNewest`, or `Error` |

Throws `BufferOverflowError` when strategy is `Error` and the buffer is full.

### `EventFilter(event, criteria)`

Filters a single-key event object against an `IFilterCriteria` map using strict equality. Returns `true` if all criteria match.

### Types

| Export | Description |
|--------|-------------|
| `TEventData` | Base type alias (`Record<string, unknown>`) — all event shapes extend this |
| `TEventFunction<TEvent>` | Handler callback: `(data: TEvent) => Promise<void> \| void` |
| `TEventHandler` | Union type for handler references |
| `TEventFilter` | Filter function type |
| `TAsyncObserver` | Async observer callback type |
| `TUnsubscribe` | Unsubscribe function type |
| `IFilterCriteria` | Index-signature interface `{ [key: string]: unknown }` |
| `ISubscriptionOptions` | Options passed to `Subscribe` |
| `IBackpressureConfig` | Configuration object for `AsyncObservable` |
| `IAsyncGeneratorESN<T, TReturn, TNext>` | `AsyncGenerator` extended with `Symbol.asyncDispose` |
| `TExtractEventPayload<TEvent>` | Utility type — extracts payload type from a `TEventData` object |
| `BackpressureStrategy` | Enum: `DropOldest`, `DropNewest`, `Error` |
| `BufferOverflowError` | Error thrown on buffer overflow when strategy is `Error` |

### Mocks (test helpers)

Import from `@pawells/rxjs-events/src/mocks/index.js` in tests (not re-exported from the main entry point):

| Export | Description |
|--------|-------------|
| `MockEventHandler` | Controllable mock with spy capabilities for asserting triggers and subscriptions |
| `MockAsyncObservable` | Controllable mock exposing push/complete/error helpers |
| `SetupMatchers` | Registers all custom Vitest matchers — call from `vitest.setup.ts` |
| `ToHaveSubscribers` | Custom matcher: asserts a handler has N active subscribers |
| `ToHaveTriggeredEvent` | Custom matcher: asserts a mock handler triggered a specific event |
| `ToMatchEventFilter` | Custom matcher: asserts an event matches a filter criteria map |
| `GenerateUserEvents` | Factory for typed user-event objects |
| `GenerateMessageEvents` | Factory for message-event objects |
| `GenerateEventData` | Generic event-data factory |
| `GenerateFilterCriteria` | Produces `IFilterCriteria` maps for filter tests |
| `GenerateSubscriptionScenarios` | Generates multi-subscription test scenarios |

## Development

```bash
yarn build            # Compile TypeScript → ./build/
yarn dev              # Build and run
yarn watch            # TypeScript watch mode
yarn typecheck        # Type check without emitting
yarn lint             # ESLint src/
yarn lint:fix         # ESLint with auto-fix
yarn test             # Run Vitest tests
yarn test:ui          # Open interactive Vitest UI in a browser
yarn test:coverage    # Run tests with coverage report
yarn start            # Run built output
```

To run a single test file:

```bash
yarn vitest run src/path/to/file.test.ts
```

## Requirements

- Node.js >= 24.0.0
- ESM-only (`"type": "module"`) — use ESM imports throughout

## License

MIT — See [LICENSE](./LICENSE) for details.
