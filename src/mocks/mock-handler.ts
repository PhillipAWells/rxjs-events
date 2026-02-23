/**
 * @fileoverview Mock implementation of EventHandler for testing scenarios
 */

import type { TEventData, TEventFunction } from '../index.js';
import type { IMockEventHandlerConfig, IMockSubscription } from './types.js';

/**
 * Mock implementation of EventHandler providing controllable behavior for testing
 *
 * @template TObject - The type of data objects this handler manages
 * @template TEvent - The type of events this handler emits (must extend EventData)
 */
export class MockEventHandler<TObject, TEvent extends TEventData> {
	/** The name of the event type */
	public readonly Name: string;

	/** Configuration for mock behavior */
	private readonly _config: Required<IMockEventHandlerConfig>;

	/** Active subscriptions */
	private readonly _subscriptions = new Map<number, IMockSubscription>();

	/** Subscription ID counter */
	private _subscriptionIdCounter = 0;

	/** Triggered events for verification */
	private readonly _triggeredEvents: TEvent[] = [];

	/** Subscription call history for verification */
	private readonly _subscriptionCalls: Array<{ id: number; timestamp: Date }> = [];

	/** Incremented on every Reset() call to terminate any live async iterators */
	private _iterationVersion = 0;

	/** Resolve callbacks registered by waiting async iterators; called when a new event arrives */
	private readonly _iteratorWaiters: Array<() => void> = [];

	/**
	 * Creates a new MockEventHandler instance
	 *
	 * @param name - The name of the event type to handle
	 * @param config - Configuration options for mock behavior
	 * @throws Error when name is empty
	 */
	constructor(name: string, config: IMockEventHandlerConfig = {}) {
		if (!name || name.trim() === '') {
			throw new Error('Event Name is Empty');
		}

		this.Name = name;
		this._config = {
			asyncMode: false,
			delay: 0,

			maxSubscribers: 100,
			trackCalls: true,
			...config,
		};
	}

	/**
	 * Mock implementation of Trigger - records events and notifies subscribers
	 *
	 * @param data - The data to wrap and broadcast as an event
	 */
	public Trigger(data: TObject): void {
		const event = { [this.Name]: data } as TEvent;
		this._triggeredEvents.push(event);

		// Notify all active subscribers
		for (const subscription of this._subscriptions.values()) {
			if (subscription.active) {
				// asyncMode only changes delivery timing when a positive delay is also configured.
				if (this._config.asyncMode && this._config.delay > 0) {
					setTimeout(() => subscription.handler(event), this._config.delay);
				} else {
					subscription.handler(event);
				}
			}
		}

		// Wake any async iterators that are waiting for the next event
		for (const notify of this._iteratorWaiters.splice(0)) {
			notify();
		}
	}

	/**
	 * Mock implementation of Subscribe - tracks subscriptions for verification
	 *
	 * @param onEvent - Function to call when events are triggered
	 * @returns number representing the subscription ID
	 * @throws Error when maximum subscribers exceeded
	 */
	public Subscribe(onEvent: TEventFunction<TEvent>): number {
		if (this._subscriptions.size >= this._config.maxSubscribers) {
			throw new Error(`Maximum subscribers (${this._config.maxSubscribers}) exceeded`);
		}

		const id = ++this._subscriptionIdCounter;
		const subscription: IMockSubscription = {
			id,
			handler: onEvent,
			createdAt: new Date(),
			active: true,
		};
		this._subscriptions.set(id, subscription);

		if (this._config.trackCalls) {
			this._subscriptionCalls.push({ id, timestamp: new Date() });
		}

		return id;
	}

	/**
	 * Mock implementation of Unsubscribe - deactivates subscription
	 *
	 * @param subscription - The subscription ID to unsubscribe
	 */
	public Unsubscribe(subscription: number): void {
		const sub = this._subscriptions.get(subscription);
		if (sub) {
			sub.active = false;
			this._subscriptions.delete(subscription);
		}
	}

	/**
	 * Mock implementation of GetAsyncIterableIterator
	 *
	 * @returns AsyncIterableIterator that yields triggered events
	 */
	public GetAsyncIterableIterator(): AsyncIterableIterator<TEvent> {
		return this._createAsyncIterator();
	}

	/**
	 * Mock implementation of GetAsyncIterator
	 *
	 * @returns AsyncIterator that can be manually advanced
	 */
	public GetAsyncIterator(): AsyncIterator<TEvent> {
		return this._createAsyncIterator();
	}

	/**
	 * Creates an async iterator that yields events from the triggered events queue.
	 * Uses a signal-based wait (no polling) so it wakes immediately when Trigger() fires.
	 */
	private async * _createAsyncIterator(): AsyncGenerator<TEvent, void, void> {
		const capturedVersion = this._iterationVersion;
		let index = 0;

		while (this._iterationVersion === capturedVersion) {
			if (index < this._triggeredEvents.length) {
				const event = this._triggeredEvents[index++];
				if (event) {
					yield event;
				}
			} else {
				// Wait until Trigger() fires (or Reset() increments the version)
				await new Promise<void>((resolve) => {
					this._iteratorWaiters.push(resolve);
				});
			}
		}
	}

	// Test utility methods
	/**
	 * Get the number of active subscribers
	 */
	public GetSubscriberCount(): number {
		return Array.from(this._subscriptions.values()).filter((sub) => sub.active).length;
	}

	/**
	 * Get all triggered events for verification
	 */
	public GetTriggeredEvents(): readonly TEvent[] {
		return [...this._triggeredEvents];
	}

	/**
	 * Get subscription call history
	 */
	public GetSubscriptionCalls(): ReadonlyArray<{ id: number; timestamp: Date }> {
		return [...this._subscriptionCalls];
	}

	/**
	 * Clear all triggered events
	 */
	public ClearTriggeredEvents(): void {
		this._triggeredEvents.length = 0;
	}

	/**
	 * Clear all subscription history
	 */
	public ClearSubscriptionHistory(): void {
		this._subscriptionCalls.length = 0;
	}

	/**
	 * Mock implementation of Destroy - terminates all iterators and unsubscribes all active
	 * subscriptions. Unlike Reset(), triggered event history and subscription call history are
	 * preserved so callers can still inspect them after destruction (matching the behaviour of
	 * the real EventHandler.Destroy() which also preserves observable history).
	 */
	public Destroy(): void {
		this._subscriptions.clear();
		// Increment version to signal live async iterators to stop
		this._iterationVersion++;
		// Wake any waiting iterators so they can observe the version change and exit
		for (const notify of this._iteratorWaiters.splice(0)) {
			notify();
		}
	}

	/**
	 * Reset mock to initial state
	 */
	public Reset(): void {
		this._subscriptions.clear();
		this._triggeredEvents.length = 0;
		this._subscriptionCalls.length = 0;
		this._subscriptionIdCounter = 0;
		// Increment version to signal live async iterators to stop
		this._iterationVersion++;
		// Wake any waiting iterators so they can observe the version change and exit
		for (const notify of this._iteratorWaiters.splice(0)) {
			notify();
		}
	}
}
