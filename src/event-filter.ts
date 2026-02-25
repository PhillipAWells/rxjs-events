import { TEventData } from './event-data.js';
import { IFilterCriteria } from './filter-criteria.js';
import { TExtractEventPayload } from './extract-event-payload.js';

/**
 * Filters events based on payload property matching criteria.
 * Performs strict equality comparison between event payload properties and filter arguments.
 *
 * @template TEvent - The event data type extending TEventData
 * @param event - The event to filter, must have exactly one property representing the event type
 * @param args - Filter criteria object with property-value pairs to match against the event payload
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
 *   };
 * }
 *
 * const event: UserEvent = {
 *   UserCreated: { userId: '123', username: 'john', role: 'admin' }
 * };
 *
 * // Match by single property
 * EventFilter(event, { role: 'admin' }); // true
 * EventFilter(event, { role: 'user' }); // false
 *
 * // Match by multiple properties
 * EventFilter(event, { username: 'john', role: 'admin' }); // true
 * EventFilter(event, { username: 'john', role: 'user' }); // false
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

	for (const [key, filterValue] of Object.entries(args)) {
		// Type-safe property access with proper unknown handling
		const payloadValue = (payload as Record<string, unknown>)[key];

		if (payloadValue !== filterValue) return false;
	}

	return true;
}
