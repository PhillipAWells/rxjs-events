import { EventHandler } from './handler.js';
import { TEventData } from './event-data.js';

/**
 * Collects events into batches of a specified size and yields each batch as an array.
 * The final batch may be smaller if the total number of events is not a multiple of the batch size.
 *
 * @template TEvent - The event type
 * @param handler - EventHandler to collect events from
 * @param size - Size of each batch (must be > 0)
 * @returns AsyncIterableIterator that yields arrays of events
 *
 * @throws {RangeError} When size is <= 0
 *
 * @example
 * ```typescript
 * const handler = new EventHandler<MessageData, MessageEvent>('Message');
 *
 * // Batch events in groups of 5
 * for await (const batch of ChunkEvents(handler, 5)) {
 *   console.log(`Processing batch of ${batch.length} events`);
 *   batch.forEach(event => processEvent(event));
 * }
 * ```
 */
export function ChunkEvents<TEvent extends TEventData = TEventData>(
	handler: EventHandler<any, TEvent>,
	size: number,
): AsyncIterableIterator<TEvent[]> {
	if (size <= 0) {
		throw new RangeError('Batch size must be greater than 0');
	}

	return (async function* (): AsyncIterableIterator<TEvent[]> {
		const batch: TEvent[] = [];

		for await (const event of handler) {
			batch.push(event);

			if (batch.length === size) {
				yield [...batch];
				batch.length = 0;
			}
		}

		// Yield any remaining events in the final batch
		if (batch.length > 0) {
			yield batch;
		}
	})();
}

/**
 * Partitions an event stream into two separate async iterators: one for matching events and one for non-matching.
 * The predicate function determines which iterator receives each event.
 *
 * @template TEvent - The event type
 * @param handler - EventHandler to partition events from
 * @param predicate - Function that determines if an event matches (true = matching, false = non-matching)
 * @returns Tuple of [matching iterator, non-matching iterator]
 *
 * @example
 * ```typescript
 * const handler = new EventHandler<UserEvent, UserEvent>('UserCreated');
 *
 * // Split events by admin status
 * const [admins, users] = PartitionEvents(handler, (event) => {
 *   return 'UserCreated' in event && event.UserCreated.role === 'admin';
 * });
 *
 * // Process matching (admin) events
 * for await (const event of admins) {
 *   console.log('Admin created:', event);
 * }
 *
 * // Process non-matching (regular user) events in parallel
 * for await (const event of users) {
 *   console.log('User created:', event);
 * }
 * ```
 */
export function PartitionEvents<TEvent extends TEventData = TEventData>(
	handler: EventHandler<any, TEvent>,
	predicate: (event: TEvent) => boolean,
): [AsyncIterableIterator<TEvent>, AsyncIterableIterator<TEvent>] {
	const matchingQueue: TEvent[] = [];
	const nonMatchingQueue: TEvent[] = [];
	let matchingResolve: (() => void) | undefined;
	let nonMatchingResolve: (() => void) | undefined;

	// Track reference count for proper cleanup
	let activeIterators = 2;

	// Subscribe to the handler and distribute events to appropriate queues
	const subscriptionId = handler.Subscribe((event) => {
		if (predicate(event)) {
			matchingQueue.push(event);
			if (matchingResolve) {
				matchingResolve();
				matchingResolve = undefined;
			}
		} else {
			nonMatchingQueue.push(event);
			if (nonMatchingResolve) {
				nonMatchingResolve();
				nonMatchingResolve = undefined;
			}
		}
	});

	const createIterator = (queue: TEvent[]): AsyncIterableIterator<TEvent> => {
		let closed = false;

		return {
			async next(): Promise<IteratorResult<TEvent>> {
				if (closed) {
					return { done: true, value: undefined };
				}

				while (queue.length === 0) {
					await new Promise<void>((resolve) => {
						if (queue === matchingQueue) {
							matchingResolve = resolve;
						} else {
							nonMatchingResolve = resolve;
						}
					});
				}

				if (queue.length > 0) {
					const event = queue.shift() as TEvent;
					return { done: false, value: event };
				}

				return { done: true, value: undefined };
			},

			[Symbol.asyncIterator]() {
				return this;
			},

			async return(): Promise<IteratorResult<TEvent>> {
				await Promise.resolve();
				closed = true;
				activeIterators--;
				// Only unsubscribe when all iterators have closed
				if (activeIterators === 0) {
					handler.Unsubscribe(subscriptionId);
				}
				return { done: true, value: undefined };
			},
		};
	};

	// Create iterators that share the same queues and handler
	const matchingIterator = createIterator(matchingQueue);
	const nonMatchingIterator = createIterator(nonMatchingQueue);

	return [matchingIterator, nonMatchingIterator];
}

/**
 * Groups events by a key function and yields each group as a Map when the group reaches a specified size.
 * Groups are keyed by the result of applying the key function to each event.
 *
 * @template TEvent - The event type
 * @template TKey - The type of the grouping key
 * @param handler - EventHandler to group events from
 * @param keyFn - Function that extracts the grouping key from an event
 * @param flushSize - Number of events needed to trigger a flush of a group
 * @returns AsyncIterableIterator that yields Maps of grouped events
 *
 * @throws {RangeError} When flushSize is <= 0
 *
 * @example
 * ```typescript
 * interface UserEvent extends TEventData {
 *   UserActivity: {
 *     userId: string;
 *     action: string;
 *     timestamp: number;
 *   };
 * }
 *
 * const handler = new EventHandler<any, UserEvent>('UserActivity');
 *
 * // Group events by userId, flush each group after 10 events
 * for await (const groups of GroupEventsByPayload(handler, (event) => {
 *   return 'UserActivity' in event ? event.UserActivity.userId : 'unknown';
 * }, 10)) {
 *   groups.forEach((events, userId) => {
 *     console.log(`User ${userId} has ${events.length} events`);
 *   });
 * }
 * ```
 */
export function GroupEventsByPayload<TEvent extends TEventData = TEventData, TKey = string>(
	handler: EventHandler<any, TEvent>,
	keyFn: (event: TEvent) => TKey,
	flushSize: number,
): AsyncIterableIterator<Map<TKey, TEvent[]>> {
	if (flushSize <= 0) {
		throw new RangeError('Flush size must be greater than 0');
	}

	return (async function* (): AsyncIterableIterator<Map<TKey, TEvent[]>> {
		const groups = new Map<TKey, TEvent[]>();
		let totalCount = 0;

		for await (const event of handler) {
			const key = keyFn(event);

			if (!groups.has(key)) {
				groups.set(key, []);
			}

			const group = groups.get(key);
			if (group) {
				group.push(event);
				totalCount++;

				// Flush all groups when any reaches the flush size
				if (group.length >= flushSize) {
					yield new Map(groups);
					groups.clear();
					totalCount = 0;
				}
			}
		}

		// Yield any remaining groups
		if (totalCount > 0) {
			yield groups;
		}
	})();
}
