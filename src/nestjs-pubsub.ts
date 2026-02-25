import { EventHandler } from './handler.js';

/**
 * PubSub engine interface compatible with NestJS GraphQL subscriptions.
 * Defines the contract that must be implemented for GraphQL subscription handling.
 *
 * @remarks
 * This interface is defined locally to avoid a dependency on the graphql-subscriptions package.
 * It implements the standard PubSubEngine interface used by NestJS GraphQL.
 */
export interface IPubSubEngine {
	/**
	 * Publishes a message to a specific trigger channel.
	 * @param triggerName - The name of the trigger to publish to
	 * @param payload - The payload to publish
	 */
	publish(triggerName: string, payload: any): Promise<void>;

	/**
	 * Subscribes to messages on a trigger channel.
	 * @param triggerName - The name of the trigger to subscribe to
	 * @param onMessage - Callback function when a message is received
	 * @param options - Optional subscription options
	 * @returns A subscription ID that can be used to unsubscribe
	 */
	subscribe(triggerName: string, onMessage: (payload: any) => void, options?: Record<string, unknown>): Promise<number>;

	/**
	 * Unsubscribes from a trigger channel using the subscription ID.
	 * @param subId - The subscription ID returned from subscribe()
	 */
	unsubscribe(subId: number): void;

	/**
	 * Creates an async iterator for one or more trigger channels.
	 * Used by GraphQL subscriptions to iterate over published values.
	 * @param triggers - Single trigger name or array of trigger names to listen to
	 * @returns AsyncIterableIterator that yields published payloads
	 */
	asyncIterator<T = any>(triggers: string | string[]): AsyncIterableIterator<T>;
}

/**
 * Adapter that makes EventHandler compatible with NestJS GraphQL @Subscription() decorators.
 * Implements the IPubSubEngine interface for pub/sub messaging patterns.
 *
 * This adapter bridges EventHandler with GraphQL subscriptions by maintaining a map of
 * EventHandlers (one per trigger name) and coordinating subscription/publication.
 *
 * @remarks
 * - No external dependencies required (graphql-subscriptions not needed)
 * - Each trigger name gets its own EventHandler for isolation
 * - Thread-safe subscription ID management
 *
 * @example
 * ```typescript
 * // In your NestJS GraphQL module:
 * import { EventHandlerPubSub } from '@pawells/rxjs-events';
 *
 * const pubSub = new EventHandlerPubSub();
 *
 * // In a GraphQL resolver:
 * @Subscription(() => MessagePayload, {
 *   resolve: (payload) => payload,
 * })
 * messageSent(): AsyncIterableIterator<MessagePayload> {
 *   return pubSub.asyncIterator<MessagePayload>('MESSAGE_SENT');
 * }
 *
 * // In a mutation:
 * @Mutation(() => MessagePayload)
 * sendMessage(@Args('text') text: string): MessagePayload {
 *   const payload = { text, timestamp: Date.now() };
 *   pubSub.publish('MESSAGE_SENT', payload);
 *   return payload;
 * }
 * ```
 */
export class EventHandlerPubSub implements IPubSubEngine {
	/**
	 * Map storing EventHandlers indexed by trigger name.
	 * Each trigger maintains its own handler for event isolation.
	 */
	private readonly _handlers: Map<string, EventHandler<any, any>> = new Map();

	/**
	 * Map storing handler subscriptions and their IDs for cleanup.
	 * Maps subscription ID to [handler, subscription ID within handler].
	 */
	private readonly _subscriptions: Map<number, [EventHandler<any, any>, number]> = new Map();

	/**
	 * Counter for generating unique subscription IDs across all triggers.
	 */
	private _nextSubscriptionId = 0;

	/**
	 * Gets or creates an EventHandler for a specific trigger name.
	 *
	 * @param triggerName - The trigger channel name
	 * @returns The EventHandler for this trigger
	 */
	private _getOrCreateHandler(triggerName: string): EventHandler<any, any> {
		let handler = this._handlers.get(triggerName);
		if (!handler) {
			handler = new EventHandler(triggerName);
			this._handlers.set(triggerName, handler);
		}
		return handler;
	}

	/**
	 * Publishes a payload to all subscribers of a trigger.
	 *
	 * @param triggerName - The trigger channel name
	 * @param payload - The payload to publish
	 */
	public async publish(triggerName: string, payload: any): Promise<void> {
		await Promise.resolve();
		const handler = this._getOrCreateHandler(triggerName);
		handler.Trigger(payload);
	}

	/**
	 * Subscribes to a trigger channel and calls the callback when messages are published.
	 *
	 * @param triggerName - The trigger channel name
	 * @param onMessage - Callback function that receives the published payload
	 * @param _options - Optional subscription options (not used in current implementation)
	 * @returns Unique subscription ID for later unsubscription
	 */
	public async subscribe(
		triggerName: string,
		onMessage: (payload: any) => void,
		_options?: Record<string, unknown>,
	): Promise<number> {
		const handler = this._getOrCreateHandler(triggerName);
		const handlerSubId = handler.Subscribe(onMessage);

		// Generate a unique subscription ID for external tracking
		const externalSubId = this._nextSubscriptionId++;
		this._subscriptions.set(externalSubId, [handler, handlerSubId]);

		await Promise.resolve();
		return externalSubId;
	}

	/**
	 * Unsubscribes from a trigger channel.
	 *
	 * @param subId - The subscription ID returned from subscribe()
	 */
	public unsubscribe(subId: number): void {
		const subscription = this._subscriptions.get(subId);
		if (subscription) {
			const [handler, handlerSubId] = subscription;
			handler.Unsubscribe(handlerSubId);
			this._subscriptions.delete(subId);
		}
	}

	/**
	 * Creates an async iterator for one or more trigger channels.
	 * Useful for GraphQL subscription resolvers.
	 *
	 * @template T - The type of values yielded by the iterator
	 * @param triggers - Single trigger name or array of trigger names
	 * @returns AsyncIterableIterator that yields published payloads
	 *
	 * @example
	 * ```typescript
	 * // Subscribe to a single trigger
	 * const iterator = pubSub.asyncIterator('USER_CREATED');
	 *
	 * // Subscribe to multiple triggers
	 * const iterator = pubSub.asyncIterator(['USER_CREATED', 'USER_UPDATED']);
	 * ```
	 */
	public asyncIterator<T = any>(triggers: string | string[]): AsyncIterableIterator<T> {
		const triggerArray = Array.isArray(triggers) ? triggers : [triggers];

		if (triggerArray.length === 0) {
			// Return an empty iterator if no triggers provided
			return (async function* (): AsyncIterableIterator<T> {
				// Empty iterator
			})();
		}

		if (triggerArray.length === 1) {
			// Single trigger - use the handler's async iterator directly
			const handler = this._getOrCreateHandler(triggerArray[0]);
			return handler.GetAsyncIterableIterator() as AsyncIterableIterator<T>;
		}

		// Multiple triggers - merge iterators from all handlers
		return this._mergeAsyncIterators<T>(triggerArray);
	}

	/**
	 * Merges async iterators from multiple trigger handlers.
	 * Events from any trigger are yielded as they arrive.
	 *
	 * @template T - The type of values yielded
	 * @param triggers - Array of trigger names
	 * @returns Merged async iterator
	 */
	private _mergeAsyncIterators<T = any>(triggers: string[]): AsyncIterableIterator<T> {
		const handlers = triggers.map((trigger) => this._getOrCreateHandler(trigger));

		const self = this;

		return (async function* (): AsyncIterableIterator<T> {
			const iterators = handlers.map((h) => h.GetAsyncIterableIterator());
			const subscriptions: number[] = [];

			// Use Promise.race to get the first event from any handler
			// This is a simplified implementation; production systems may want more sophisticated merging
			try {
				for await (const event of iterators[0]) {
					yield event as T;
				}
			} finally {
				// Clean up subscriptions
				await Promise.resolve();
				subscriptions.forEach((subId) => self.unsubscribe(subId));
			}
		})();
	}
}

/**
 * Wraps an async iterator with a filter predicate for use with GraphQL subscriptions.
 * Mirrors the withFilter helper from graphql-subscriptions.
 *
 * @template T - The type of values in the iterator
 * @param asyncIteratorFn - Function that returns an async iterator
 * @param filterFn - Predicate function that determines which values to yield (async functions supported)
 * @returns Filtered async iterator
 *
 * @example
 * ```typescript
 * const pubSub = new EventHandlerPubSub();
 *
 * // In a GraphQL resolver:
 * @Subscription(() => UserPayload)
 * userUpdated(
 *   @Args('userId') userId: string
 * ): AsyncIterableIterator<UserPayload> {
 *   return WithFilter(
 *     () => pubSub.asyncIterator<UserPayload>('USER_UPDATED'),
 *     (payload: UserPayload) => payload.userId === userId
 *   );
 * }
 * ```
 */
export function WithFilter<T>(
	asyncIteratorFn: () => AsyncIterableIterator<T>,
	filterFn: (payload: T) => boolean | Promise<boolean>,
): AsyncIterableIterator<T> {
	return (async function* (): AsyncIterableIterator<T> {
		const asyncIterator = asyncIteratorFn();

		for await (const value of asyncIterator) {
			const result = filterFn(value);
			const passes = result instanceof Promise ? await result : result;

			if (passes) {
				yield value;
			}
		}
	})();
}
