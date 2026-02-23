
/**
 * @fileoverview Tests for MockEventHandler
 */

import { TEventData } from '../event-data.js';
import { MockEventHandler } from '../mocks/index.js';
import '../mocks/matchers-setup.js';

interface ITestEvent extends TEventData {
	testEvent: {
		id: string;
		message: string;
	};
}
describe('MockEventHandler', () => {
	describe('Core API', () => {
		test('should create handler with name', () => {
			const handler = new MockEventHandler<any, ITestEvent>('testEvent');
			expect(handler.Name).toBe('testEvent');
		});

		test('should throw error for empty name', () => {
			expect(() => new MockEventHandler('', {})).toThrow('Event Name is Empty');
		});

		test('should track subscriptions', async () => {
			const handler = new MockEventHandler<any, ITestEvent>('testEvent');

			const sub1 = await handler.Subscribe(() => {
				// Test subscription
			});
			const sub2 = await handler.Subscribe(() => {
				// Test subscription
			});
			expect(handler).toHaveSubscribers(2);
			expect(typeof sub1).toBe('number');
			expect(typeof sub2).toBe('number');
		});

		test('should trigger events', () => {
			const handler = new MockEventHandler<any, ITestEvent>('testEvent');
			handler.Trigger({ id: '1', message: 'test' });

			expect(handler).toHaveTriggeredEvent('testEvent', { id: '1', message: 'test' });
		});

		test('should unsubscribe properly', async () => {
			const handler = new MockEventHandler<any, ITestEvent>('testEvent');

			const subId = await handler.Subscribe(() => {
				// Test subscription
			});
			expect(handler).toHaveSubscribers(1);

			handler.Unsubscribe(subId);
			expect(handler).toHaveSubscribers(0);
		});

		test('should reset to initial state', async () => {
			const handler = new MockEventHandler<any, ITestEvent>('testEvent');
			await handler.Subscribe(() => {
				// Test subscription
			});
			handler.Trigger({ id: '1', message: 'test' });

			expect(handler).toHaveSubscribers(1);
			expect(handler.GetTriggeredEvents()).toHaveLength(1);

			handler.Reset();

			expect(handler).toHaveSubscribers(0);
			expect(handler.GetTriggeredEvents()).toHaveLength(0);
		});

		// Phase 4: MockEventHandler Edge Cases
		test('TC-MH-001 - Async Mode Triggering', async () => {
			const handler = new MockEventHandler<any, ITestEvent>('testEvent', { asyncMode: true, delay: 50 });
			let receivedEvent: ITestEvent | undefined;

			await handler.Subscribe((event) => {
				receivedEvent = event;
			});

			handler.Trigger({ id: '1', message: 'async test' });

			// Event should not be received immediately
			expect(receivedEvent).toBeUndefined();

			// Wait for the delay
			await new Promise(resolve => setTimeout(resolve, 60));

			// Now event should be received
			expect(receivedEvent).toEqual({ testEvent: { id: '1', message: 'async test' } });
		});

		test('TC-MH-002 - Max Subscribers Exceeded Error', async () => {
			const handler = new MockEventHandler<any, ITestEvent>('testEvent', { maxSubscribers: 2 });

			await handler.Subscribe(() => {});
			await handler.Subscribe(() => {});

			// The error is thrown synchronously when maxSubscribers is exceeded
			expect(() => handler.Subscribe(() => {})).toThrow('Maximum subscribers (2) exceeded');
		});

		test('TC-MH-003 - Subscribe Always Returns Number', () => {
			// asyncMode controls when handlers are called (via setTimeout), not the Subscribe return type
			const handler = new MockEventHandler<any, ITestEvent>('testEvent', { asyncMode: true });

			const result = handler.Subscribe(() => {});

			expect(typeof result).toBe('number');
		});

		test('TC-MH-004 - GetAsyncIterableIterator Yields Events', async () => {
			const handler = new MockEventHandler<any, ITestEvent>('testEvent');
			const iterator = handler.GetAsyncIterableIterator();
			const receivedEvents: ITestEvent[] = [];

			// Start collecting events asynchronously
			const collectorPromise = (async () => {
				for await (const event of iterator) {
					receivedEvents.push(event);
					if (receivedEvents.length >= 2) break; // Stop after 2 events
				}
			})();

			// Trigger events
			handler.Trigger({ id: '1', message: 'first' });
			handler.Trigger({ id: '2', message: 'second' });

			// Wait for the collector to finish
			await collectorPromise;
		});

		test('TC-MH-005 - GetAsyncIterator Manual Control', async () => {
			const handler = new MockEventHandler<any, ITestEvent>('testEvent');
			const iterator = handler.GetAsyncIterator();

			handler.Trigger({ id: '1', message: 'first' });
			handler.Trigger({ id: '2', message: 'second' });

			const result1 = await iterator.next();
			expect(result1.done).toBe(false);
			expect(result1).toHaveProperty('value', { testEvent: { id: '1', message: 'first' } });

			const result2 = await iterator.next();
			expect(result2.done).toBe(false);
			expect(result2).toHaveProperty('value', { testEvent: { id: '2', message: 'second' } });
		});

		test('TC-MH-006 - Subscription Call Tracking', async () => {
			const handler = new MockEventHandler<any, ITestEvent>('testEvent', { trackCalls: true });

			const sub1 = await handler.Subscribe(() => {});
			const sub2 = await handler.Subscribe(() => {});

			const calls = handler.GetSubscriptionCalls();
			expect(calls).toHaveLength(2);
			expect(calls[0]!).toHaveProperty('id', sub1);
			expect(calls[1]!).toHaveProperty('id', sub2);
			expect(calls[0]!.timestamp).toBeInstanceOf(Date);
			expect(calls[1]!.timestamp).toBeInstanceOf(Date);
		});

		test('TC-MH-007 - Clear Triggered Events', () => {
			const handler = new MockEventHandler<any, ITestEvent>('testEvent');

			handler.Trigger({ id: '1', message: 'test' });
			expect(handler.GetTriggeredEvents()).toHaveLength(1);

			handler.ClearTriggeredEvents();
			expect(handler.GetTriggeredEvents()).toHaveLength(0);
		});

		test('TC-MH-008 - Clear Subscription History', async () => {
			const handler = new MockEventHandler<any, ITestEvent>('testEvent', { trackCalls: true });

			await handler.Subscribe(() => {});
			await handler.Subscribe(() => {});
			expect(handler.GetSubscriptionCalls()).toHaveLength(2);

			handler.ClearSubscriptionHistory();
			expect(handler.GetSubscriptionCalls()).toHaveLength(0);
		});
	});
});
