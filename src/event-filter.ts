import { ObjectFilter } from '@pawells/typescript-common';
import { TEventData } from './event-data.js';
import { IFilterCriteria } from './filter-criteria.js';
import { TExtractEventPayload } from './extract-event-payload.js';

/**
 * Filters events based on payload property matching criteria.
 * Performs strict equality comparison between event payload properties and filter arguments.
 * Supports nested property paths using dot notation and predicate functions.
 *
 * @template TEvent - The event data type extending TEventData
 * @param event - The event to filter, must have exactly one property representing the event type
 * @param args - Filter criteria object with property-value pairs to match against the event payload.
 *              Values can be:
 *              - Primitives: matched via strict equality
 *              - Functions: treated as predicates that must return true
 *              - Keys can use dot notation for nested paths (e.g., 'user.profile.role')
 * @returns true if the event matches all filter criteria or if no filter is provided, false otherwise
 *
 * @throws {Error} 'No Event' - When event is null or undefined
 * @throws {Error} 'More than one payload structure.' - When event has more than one top-level property
 * @throws {Error} 'No Payload' - When the event's payload is null or undefined
 *
 * @example
 * ```typescript
 * interface UserEvent extends TEventData {
 *   UserCreated: {
 *     userId: string;
 *     username: string;
 *     role: string;
 *     profile: {
 *       age: number;
 *       status: string;
 *     };
 *   };
 * }
 *
 * const event: UserEvent = {
 *   UserCreated: {
 *     userId: '123',
 *     username: 'john',
 *     role: 'admin',
 *     profile: { age: 30, status: 'active' }
 *   }
 * };
 *
 * // Match by single property
 * EventFilter(event, { role: 'admin' }); // true
 * EventFilter(event, { role: 'user' }); // false
 *
 * // Match by nested path
 * EventFilter(event, { 'profile.age': 30 }); // true
 * EventFilter(event, { 'profile.status': 'active' }); // true
 *
 * // Match by predicate function
 * EventFilter(event, { 'profile.age': (v) => v > 18 }); // true
 * EventFilter(event, { role: (r) => r === 'admin' }); // true
 *
 * // Multiple criteria
 * EventFilter(event, { role: 'admin', 'profile.age': (v) => v > 18 }); // true
 *
 * // No filter (always passes)
 * EventFilter(event, null); // true
 * EventFilter(event, undefined); // true
 * ```
 */
export function EventFilter<TEvent extends TEventData = TEventData>(
	event: TEvent,
	args: IFilterCriteria | null | undefined,
): boolean {
	if (!event) throw new Error('No Event');
	// If no arguments are provided, then we are not filtering anything.
	if (!args) return true;

	// Identify Payload Key
	const eventKeys = Object.keys(event);

	if (eventKeys.length === 0) throw new Error('Event object must have exactly one top-level key, but received an empty object ({}).');
	if (eventKeys.length > 1) throw new Error('More than one payload structure.');

	const eventKey = eventKeys[0] as keyof TEvent;

	// Get Payload - now properly typed
	const payload = event[eventKey] as TExtractEventPayload<TEvent>;

	if (!payload) throw new Error('No Payload');

	return ObjectFilter(payload, args as Record<string, unknown>);
}

/**
 * Partitions an event into matching and non-matching tuples based on filter criteria.
 * Uses EventFilter internally to apply the filtering logic.
 *
 * @template TEvent - The event data type extending TEventData
 * @param event - The event to partition
 * @param args - Filter criteria (same as EventFilter)
 * @returns Tuple of [matching event, non-matching event] where non-matching is null if event matches
 *
 * @example
 * ```typescript
 * const event: UserEvent = {
 *   UserCreated: { userId: '123', username: 'john', role: 'admin' }
 * };
 *
 * const [match, noMatch] = PartitionEventFilter(event, { role: 'admin' });
 * // match = event, noMatch = null
 *
 * const [match2, noMatch2] = PartitionEventFilter(event, { role: 'user' });
 * // match2 = null, noMatch2 = event
 * ```
 */
export function PartitionEventFilter<TEvent extends TEventData = TEventData>(
	event: TEvent,
	args: IFilterCriteria | null | undefined,
): [TEvent | null, TEvent | null] {
	const matches = EventFilter(event, args);
	return matches ? [event, null] : [null, event];
}
