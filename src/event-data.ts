/**
 * Base interface for all event data structures.
 * Events should have a single key representing the event type with associated payload data.
 *
 * @example
 * ```typescript
 * interface UserCreatedEvent extends TEventData {
 *   UserCreated: {
 *     userId: string;
 *     username: string;
 *     email: string;
 *   };
 * }
 * ```
 */
export type TEventData = Record<string, unknown>;
