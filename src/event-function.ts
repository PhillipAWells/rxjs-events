import { TEventData } from './event-data.js';

/**
 * Function type for handling events. Can be synchronous or asynchronous.
 *
 * @template TEvent - The specific event data type extending TEventData
 * @param data - The event data to be processed
 * @returns Promise<void> for async handlers, void for sync handlers
 *
 * @example
 * ```typescript
 * // Synchronous event handler
 * const syncHandler: TEventFunction<UserCreatedEvent> = (event) => {
 *   console.log('User created:', event.UserCreated.username);
 * };
 *
 * // Asynchronous event handler
 * const asyncHandler: TEventFunction<UserCreatedEvent> = async (event) => {
 *   await saveUserToDatabase(event.UserCreated);
 * };
 * ```
 */
export type TEventFunction<TEvent extends TEventData = TEventData> = (_data: TEvent) => Promise<void> | void;
