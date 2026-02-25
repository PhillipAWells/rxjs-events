import { Subject, Subscription } from 'rxjs';
import { TEventData } from './event-data.js';
import { TEventFunction } from './event-function.js';

/**
 * Event handler class that provides reactive event management with RxJS integration.
 * Supports subscription management, event triggering, and async iteration patterns.
 *
 * @template TObject - The type of data objects that can be triggered as events
 * @template TEvent - The event data type extending TEventData that will be received by subscribers
 *
 * @example
 * ```typescript
 * interface MessageData {
 *   id: number;
 *   text: string;
 * }
 *
 * interface MessageEvent extends TEventData {
 *   MessageReceived: MessageData;
 * }
 *
 * // Create handler
 * const handler = new EventHandler<MessageData, MessageEvent>('MessageReceived');
 *
 * // Subscribe to events
 * const subscription = handler.Subscribe(async (event) => {
 *   console.log('Message:', event.MessageReceived.text);
 * });
 *
 * // Trigger events
 * handler.Trigger({ id: 1, text: 'Hello World' });
 *
 * // Unsubscribe
 * handler.Unsubscribe(subscription);
 *
 * // Async iteration
 * for await (const event of handler.GetAsyncIterableIterator()) {
 *   console.log('Async event:', event.MessageReceived.text);
 *   break; // Important: break to avoid infinite loop
 * }
 * ```
 */
export class EventHandler<TObject extends object = object, TEvent extends TEventData = TEventData> {
	/**
	 * The name of the event type this handler manages.
	 * Used as the key when wrapping triggered data into event objects.
	 */
	public readonly Name: string;

	/**
	 * Creates a new EventHandler instance.
	 *
	 * @param name - The name of the event type to handle. Cannot be empty.
	 * @throws {Error} 'Event Name is Empty' - When the provided name is an empty string
	 *
	 * @example
	 * ```typescript
	 * const handler = new EventHandler('UserRegistered');
	 * console.log(handler.Name); // 'UserRegistered'
	 * ```
	 */
	constructor(name: string) {
		this.Name = name;
		if (this.Name.length === 0) throw new Error('Event Name is Empty');
	}

	/** Internal map storing active subscriptions by their unique IDs */
	protected _subscriptions: Map<number, Subscription> = new Map<number, Subscription>();

	/**
	 * Set of available subscription IDs for efficient reuse.
	 * IDs are reused in insertion order (i.e. the order they were freed via Unsubscribe).
	 * This is deterministic but not necessarily ascending; callers must not depend on a
	 * specific reuse order.
	 */
	private readonly _AvailableIds: Set<number> = new Set<number>();

	/** Next sequential ID to assign when no IDs are available for reuse */
	private _NextId: number = 0;

	/** Internal RxJS Subject for event broadcasting */
	private readonly _Subject: Subject<TEvent> = new Subject<TEvent>();

	/**
	 * Returns an async iterable iterator for receiving events.
	 * Allows using for-await-of loops to process events as they arrive.
	 *
	 * @returns AsyncIterableIterator that yields events as they are triggered
	 *
	 * @example
	 * ```typescript
	 * const handler = new EventHandler<MessageData, MessageEvent>('Message');
	 *
	 * // Process events in a background task
	 * const processEvents = async () => {
	 *   for await (const event of handler.GetAsyncIterableIterator()) {
	 *     console.log('Received:', event.Message.text);
	 *     // Important: include break condition to avoid infinite loop
	 *     if (shouldStop) break;
	 *   }
	 * };
	 *
	 * processEvents();
	 * handler.Trigger({ text: 'Hello' }); // Will be processed by the loop
	 * ```
	 */
	public async * GetAsyncIterableIterator(): AsyncIterableIterator<TEvent> {
		const queue: TEvent[] = [];
		let resolve: (() => void) | undefined;
		let reject: ((reason?: unknown) => void) | undefined;
		let promise: Promise<void> | undefined;
		let error: unknown;
		let hasError = false;

		const subscription = this._Subject.subscribe({
			next: (value) => {
				queue.push(value);
				if (resolve) {
					resolve();
					resolve = undefined;
					reject = undefined;
					promise = undefined;
				}
			},
			error: (err) => {
				hasError = true;
				error = err;
				if (reject) {
					reject(err);
					resolve = undefined;
					reject = undefined;
					promise = undefined;
				}
			},
			complete: () => {
				if (resolve) {
					resolve();
					resolve = undefined;
					reject = undefined;
					promise = undefined;
				}
			},
		});

		try {
			while (!subscription.closed) {
				if (hasError) {
					throw error;
				}

				if (queue.length === 0) {
					promise = new Promise<void>((res, rej) => {
						resolve = res;
						reject = rej;
					});
					await promise;
				}

				if (hasError) {
					throw error;
				}

				if (queue.length > 0) {
					const value = queue.shift();
					if (value !== undefined) {
						yield value;
					}
				} else {
					break;
				}
			}
		} finally {
			subscription.unsubscribe();
		}
	}

	/**
	 * Returns an async iterator for receiving events.
	 * Provides lower-level access to the event stream compared to GetAsyncIterableIterator.
	 *
	 * @returns AsyncIterator that can be manually advanced with next() calls
	 *
	 * @example
	 * ```typescript
	 * const handler = new EventHandler<MessageData, MessageEvent>('Message');
	 * const iterator = handler.GetAsyncIterator();
	 *
	 * // Manually advance the iterator
	 * const result1 = await iterator.next();
	 * console.log('First event:', result1.value?.Message.text);
	 *
	 * const result2 = await iterator.next();
	 * console.log('Second event:', result2.value?.Message.text);
	 * ```
	 */
	public GetAsyncIterator(): AsyncIterator<TEvent> {
		return this.GetAsyncIterableIterator();
	}

	/**
	 * Makes EventHandler directly usable in for-await-of loops.
	 * Delegates to GetAsyncIterableIterator().
	 *
	 * @example
	 * ```typescript
	 * for await (const event of handler) {
	 *   console.log(event);
	 *   if (shouldStop) break;
	 * }
	 * ```
	 */
	public [Symbol.asyncIterator](): AsyncIterableIterator<TEvent> {
		return this.GetAsyncIterableIterator();
	}

	/**
	 * Triggers an event with the provided data.
	 * Wraps the data in an event object using the handler's name as the key.
	 *
	 * @param data - The data to wrap and broadcast as an event
	 *
	 * @example
	 * ```typescript
	 * interface UserData {
	 *   id: string;
	 *   name: string;
	 * }
	 *
	 * const handler = new EventHandler<UserData, any>('UserCreated');
	 * handler.Trigger({ id: '123', name: 'John' });
	 * // Subscribers will receive: { UserCreated: { id: '123', name: 'John' } }
	 * ```
	 */
	public Trigger(data: TObject): void {
		const event = { [this.Name]: data } as TEvent;
		this._Subject.next(event);
	}

	/**
	 * Subscribes to events with the provided handler function.
	 * Uses optimized O(1) ID allocation for efficient subscription management.
	 *
	 * @param onEvent - Function to call when events are triggered
	 * @returns number representing the unique subscription ID
	 *
	 * @remarks
	 * **Error handling:** if the internal RxJS Subject ever errors (which only happens if
	 * external code accesses `_Subject` directly), the error is logged via `console.error`
	 * and the subscription silently stops receiving events.  If you need in-band error
	 * delivery use `GetAsyncIterableIterator()` instead, which propagates Subject errors as
	 * iterator rejections.
	 *
	 * @example
	 * ```typescript
	 * interface MessageEvent extends TEventData {
	 *   MessageReceived: { text: string };
	 * }
	 *
	 * const handler = new EventHandler<any, MessageEvent>('MessageReceived');
	 *
	 * // Synchronous subscription
	 * const subId = handler.Subscribe((event) => {
	 *   console.log('Message:', event.MessageReceived.text);
	 * });
	 *
	 * // Asynchronous subscription
	 * const asyncSubId = handler.Subscribe(async (event) => {
	 *   await processMessage(event.MessageReceived);
	 * });
	 *
	 * // Later unsubscribe
	 * handler.Unsubscribe(subId);
	 * handler.Unsubscribe(asyncSubId);
	 * ```
	 */
	public Subscribe(onEvent: TEventFunction<TEvent>): number {
		const sub = this._Subject.subscribe({
			next: onEvent,
			error: (err) => {
				// Prevent an unhandled RxJS error from crashing the process.
				// Note: after a Subject errors, no further events will be delivered to this subscriber.
				// Use GetAsyncIterableIterator() to receive errors in-band.
				console.error('EventHandler subscription error:', err);
			},
		});

		// Optimized ID allocation: O(1) performance
		let id: number;

		if (this._AvailableIds.size > 0) {
			// Reuse an available ID - O(1) operation
			const iterator = this._AvailableIds.values();
			id = iterator.next().value as number;
			this._AvailableIds.delete(id);
		} else {
			// Use next sequential ID - O(1) operation
			id = this._NextId;
			this._NextId += 1;
		}

		this._subscriptions.set(id, sub);
		return id;
	}

	/**
	 * Unsubscribes from events using the subscription ID.
	 * Safely handles non-existent subscription IDs without throwing errors.
	 * Freed IDs are made available for reuse to optimize memory usage.
	 *
	 * @param subscription - The unique subscription ID returned from Subscribe()
	 *
	 * @example
	 * ```typescript
	 * const handler = new EventHandler('TestEvent');
	 *
	 * const subId = handler.Subscribe((event) => {
	 *   console.log('Event received');
	 * });
	 *
	 * // Later, unsubscribe
	 * handler.Unsubscribe(subId);
	 *
	 * // Safe to call with non-existent IDs
	 * handler.Unsubscribe(999); // No error thrown
	 * ```
	 */
	public Unsubscribe(subscription: number): void {
		const sub = this._subscriptions.get(subscription);
		if (!sub) return;

		this._subscriptions.delete(subscription);
		sub.unsubscribe();

		// Add the freed ID back to available set for reuse - O(1) operation
		this._AvailableIds.add(subscription);
	}

	/**
	 * Destroys the event handler and cleans up all resources.
	 * Completes the internal subject and unsubscribes all active subscriptions.
	 *
	 * @example
	 * ```typescript
	 * const handler = new EventHandler('TestEvent');
	 * handler.Subscribe((event) => { });
	 * handler.Destroy(); // Cleanup
	 * ```
	 */
	public Destroy(): void {
		this._Subject.complete();

		// Unsubscribe all active subscriptions
		for (const subscription of this._subscriptions.values()) {
			subscription.unsubscribe();
		}

		// Clear all subscriptions and available IDs
		this._subscriptions.clear();
		this._AvailableIds.clear();
	}

	/**
	 * Gets the total count of active subscriptions.
	 *
	 * @returns The number of currently active subscriptions
	 *
	 * @example
	 * ```typescript
	 * const handler = new EventHandler('TestEvent');
	 * handler.Subscribe((event) => { });
	 * handler.Subscribe((event) => { });
	 * console.log(handler.GetSubscriptionCount()); // 2
	 * ```
	 */
	public GetSubscriptionCount(): number {
		return this._subscriptions.size;
	}

	/**
	 * Gets all subscription IDs that are currently active.
	 * The returned array is a snapshot of active IDs at the time of the call.
	 *
	 * @returns Array of active subscription IDs
	 *
	 * @example
	 * ```typescript
	 * const handler = new EventHandler('TestEvent');
	 * const id1 = handler.Subscribe((event) => { });
	 * const id2 = handler.Subscribe((event) => { });
	 * const ids = handler.GetActiveSubscriptionIds();
	 * console.log(ids); // [0, 1] or similar
	 * ```
	 */
	public GetActiveSubscriptionIds(): number[] {
		return Array.from(this._subscriptions.keys());
	}
}
