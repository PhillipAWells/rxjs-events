import { describe, it, expect, beforeEach } from 'vitest';
import { EventHandler } from '../index.js';
import type { TEventData } from '../index.js';

interface ITestData {
	id: number;
	value: string;
}

type TTestEvent = TEventData & {
	TestEvent: ITestData;
};

describe('EventHandler Subscription Introspection', () => {
	let handler: EventHandler<ITestData, TTestEvent>;

	beforeEach(() => {
		handler = new EventHandler<ITestData, TTestEvent>('TestEvent');
	});

	describe('GetSubscriptionCount', () => {
		it('should return 0 for new handler', () => {
			expect(handler.GetSubscriptionCount()).toBe(0);
		});

		it('should return correct count after subscriptions', () => {
			handler.Subscribe(() => {
				// handler
			});
			expect(handler.GetSubscriptionCount()).toBe(1);

			handler.Subscribe(() => {
				// handler
			});
			expect(handler.GetSubscriptionCount()).toBe(2);

			handler.Subscribe(() => {
				// handler
			});
			expect(handler.GetSubscriptionCount()).toBe(3);
		});

		it('should decrease count after unsubscribe', () => {
			const _sub1 = handler.Subscribe(() => {
				// handler
			});
			const sub2 = handler.Subscribe(() => {
				// handler
			});

			expect(handler.GetSubscriptionCount()).toBe(2);

			handler.Unsubscribe(_sub1);
			expect(handler.GetSubscriptionCount()).toBe(1);

			handler.Unsubscribe(sub2);
			expect(handler.GetSubscriptionCount()).toBe(0);
		});

		it('should not change when unsubscribing non-existent ID', () => {
			const _sub1 = handler.Subscribe(() => {
				// handler
			});

			expect(handler.GetSubscriptionCount()).toBe(1);

			handler.Unsubscribe(999);
			expect(handler.GetSubscriptionCount()).toBe(1);
		});

		it('should reset to 0 after Destroy', () => {
			handler.Subscribe(() => {
				// handler
			});
			handler.Subscribe(() => {
				// handler
			});

			expect(handler.GetSubscriptionCount()).toBe(2);

			handler.Destroy();
			expect(handler.GetSubscriptionCount()).toBe(0);
		});
	});

	describe('GetActiveSubscriptionIds', () => {
		it('should return empty array for new handler', () => {
			const ids = handler.GetActiveSubscriptionIds();
			expect(ids).toEqual([]);
			expect(Array.isArray(ids)).toBe(true);
		});

		it('should return array of subscription IDs', () => {
			const _sub1 = handler.Subscribe(() => {
				// handler
			});
			const _sub2 = handler.Subscribe(() => {
				// handler
			});
			const _sub3 = handler.Subscribe(() => {
				// handler
			});

			const ids = handler.GetActiveSubscriptionIds();
			expect(ids.length).toBe(3);
			expect(ids).toContain(_sub1);
			expect(ids).toContain(_sub2);
			expect(ids).toContain(_sub3);
		});

		it('should exclude unsubscribed IDs', () => {
			const _sub1 = handler.Subscribe(() => {
				// handler
			});
			const sub2 = handler.Subscribe(() => {
				// handler
			});
			const _sub3 = handler.Subscribe(() => {
				// handler
			});

			handler.Unsubscribe(sub2);

			const ids = handler.GetActiveSubscriptionIds();
			expect(ids.length).toBe(2);
			expect(ids).toContain(_sub1);
			expect(ids).toContain(_sub3);
			expect(ids).not.toContain(sub2);
		});

		it('should return empty array after Destroy', () => {
			handler.Subscribe(() => {
				// handler
			});
			handler.Subscribe(() => {
				// handler
			});

			handler.Destroy();

			const ids = handler.GetActiveSubscriptionIds();
			expect(ids).toEqual([]);
		});

		it('should be a snapshot (not mutable)', () => {
			const _sub1 = handler.Subscribe(() => {
				// handler
			});

			const ids1 = handler.GetActiveSubscriptionIds();
			const _sub2 = handler.Subscribe(() => {
				// handler
			});

			const ids2 = handler.GetActiveSubscriptionIds();

			// ids1 should not be affected by adding sub2
			expect(ids1.length).toBe(1);
			expect(ids2.length).toBe(2);

			// Modifying returned array should not affect handler
			ids1.push(999);
			expect(handler.GetSubscriptionCount()).toBe(2);
		});

		it('should handle subscription ID reuse correctly', () => {
			const sub1 = handler.Subscribe(() => {
				// handler
			});
			const sub2 = handler.Subscribe(() => {
				// handler
			});

			handler.Unsubscribe(sub1);

			// sub1's ID should be available for reuse
			const sub3 = handler.Subscribe(() => {
				// handler
			});

			// sub3 should have reused sub1's ID
			expect(sub3).toBe(sub1);

			const ids = handler.GetActiveSubscriptionIds();
			expect(ids.length).toBe(2);
			expect(ids).toContain(sub2);
			expect(ids).toContain(sub3);
		});
	});

	describe('Integration with event handling', () => {
		it('should track subscriptions that receive events', () => {
			const events1: TTestEvent[] = [];
			const events2: TTestEvent[] = [];

			const _sub1 = handler.Subscribe((event) => {
				events1.push(event);
			});

			const sub2 = handler.Subscribe((event) => {
				events2.push(event);
			});

			expect(handler.GetSubscriptionCount()).toBe(2);
			expect(handler.GetActiveSubscriptionIds()).toContain(_sub1);
			expect(handler.GetActiveSubscriptionIds()).toContain(sub2);

			handler.Trigger({ id: 1, value: 'test' });

			expect(events1.length).toBe(1);
			expect(events2.length).toBe(1);

			handler.Unsubscribe(_sub1);

			handler.Trigger({ id: 2, value: 'test' });

			expect(events1.length).toBe(1); // Didn't receive second event
			expect(events2.length).toBe(2); // Received second event

			expect(handler.GetSubscriptionCount()).toBe(1);
			expect(handler.GetActiveSubscriptionIds()).toEqual([sub2]);
		});
	});
});
