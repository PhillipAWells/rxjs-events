
import { vi } from 'vitest';
import { TEventData } from '../event-data.js';
import { EventHandler } from '../handler.js';

// Define test event interfaces
type TErrorTestEvent = TEventData & {
	ErrorTest: {
		message: string;
	};
};

describe('EventHandler Edge Cases', () => {
	afterEach(() => {
		vi.clearAllTimers();
	});

	describe('Async Iterator Methods', () => {
		it('should provide GetAsyncIterator method', () => {
			const handler = new EventHandler('TestEvent');

			const iterator = handler.GetAsyncIterator();
			expect(typeof iterator.next).toBe('function');
			expect(typeof iterator.return).toBe('function');
			expect(typeof iterator.throw).toBe('function');
		});

		it('should handle completion in async iteration', async () => {
			const handler = new EventHandler<{ message: string }, TErrorTestEvent>('ErrorTest');

			// Create an iterator
			const iterator = handler.GetAsyncIterableIterator();

			// Start the iteration in the background
			const iterationPromise = (async () => {
				const result = await iterator.next();
				expect(result.done).toBe(true);
				expect(result.value).toBeUndefined();
			})();

			// Destroy() completes the internal Subject, which terminates the iterator.
			handler.Destroy();

			await iterationPromise;
		});
	});

	describe('Subscription Edge Cases', () => {
		it('should handle rapid subscribe/unsubscribe cycles', async () => {
			const handler = new EventHandler('RapidTest');

			// Create many subscriptions rapidly
			const subscriptions: number[] = [];
			for (let i = 0; i < 100; i++) {
				const sub = handler.Subscribe(() => {});
				subscriptions.push(sub);
			}

			// Unsubscribe all
			subscriptions.forEach(sub => handler.Unsubscribe(sub));

			// Verify all subscriptions are cleaned up
			expect((handler as any)._subscriptions.size).toBe(0);
			expect((handler as any)._AvailableIds.size).toBe(100); // All IDs should be available for reuse

			// Subscribe again and verify ID reuse
			const newSub = handler.Subscribe(() => {});
			expect(newSub).toBe(0); // Should reuse the first available ID
		});

		it('should handle subscription with complex event data', async () => {
			type TComplexEvent = TEventData & {
				UserAction: {
					userId: string;
					action: string;
					timestamp: Date;
					metadata: {
						source: string;
						version: number;
					};
				};
			};

			const handler = new EventHandler<{
				userId: string;
				action: string;
				timestamp: Date;
				metadata: { source: string; version: number };
			}, TComplexEvent>('UserAction');

			let receivedEvent: TComplexEvent | undefined;

			const subscription = handler.Subscribe((event) => {
				receivedEvent = event;
			});

			const testData = {
				userId: 'user123',
				action: 'login',
				timestamp: new Date(),
				metadata: {
					source: 'web',
					version: 1.2,
				},
			};

			handler.Trigger(testData);

			// Wait for async delivery
			await new Promise(resolve => setTimeout(resolve, 10));

			expect(receivedEvent).toEqual({
				UserAction: testData,
			});

			handler.Unsubscribe(subscription);
		});
	});

	describe('Destroy', () => {
		it('should stop delivering events to subscribers after Destroy()', () => {
			const handler = new EventHandler<{ msg: string }, TEventData>('DestroyTest');
			const received: string[] = [];
			handler.Subscribe((event) => {
				received.push((event as any).DestroyTest.msg);
			});

			handler.Trigger({ msg: 'before' });
			handler.Destroy();
			handler.Trigger({ msg: 'after' });

			expect(received).toEqual(['before']);
		});

		it('should clear all subscriptions after Destroy()', () => {
			const handler = new EventHandler('DestroyClean');
			handler.Subscribe(() => {});
			handler.Subscribe(() => {});
			handler.Destroy();

			expect((handler as any)._subscriptions.size).toBe(0);
			expect((handler as any)._AvailableIds.size).toBe(0);
		});

		it('should complete the async iterator when Destroy() is called', async () => {
			const handler = new EventHandler<{ n: number }, TEventData>('DestroyIter');

			const iterationPromise = (async () => {
				const results: number[] = [];
				for await (const event of handler) {
					results.push((event as any).DestroyIter.n);
				}
				return results;
			})();

			handler.Trigger({ n: 1 });
			handler.Trigger({ n: 2 });

			// Give the iterator time to process buffered events
			await new Promise(resolve => setTimeout(resolve, 10));
			handler.Destroy();

			const results = await iterationPromise;
			expect(results).toContain(1);
			expect(results).toContain(2);
		});

		it('should be safe to call Trigger() after Destroy()', () => {
			const handler = new EventHandler('SafeAfterDestroy');
			handler.Destroy();
			expect(() => handler.Trigger({})).not.toThrow();
		});
	});

	describe('AsyncIterator Edge Cases', () => {
		it('should handle GetAsyncIterator method', async () => {
			const handler = new EventHandler<{ value: number }, TEventData>('IteratorTest');

			const iterator = handler.GetAsyncIterator();
			expect(typeof iterator.next).toBe('function');
			expect(typeof iterator.return).toBe('function');
			expect(typeof iterator.throw).toBe('function');
		});

		it('should handle multiple async iterators simultaneously', async () => {
			const handler = new EventHandler<{ id: number }, TEventData>('MultiIterator');

			const iterator1 = handler.GetAsyncIterator();
			const iterator2 = handler.GetAsyncIterator();

			const results1: number[] = [];
			const results2: number[] = [];

			const promise1 = (async () => {
				const result = await iterator1.next();
				if (!result.done && result.value) {
					results1.push((result.value as any).MultiIterator.id);
				}
			})();

			const promise2 = (async () => {
				const result = await iterator2.next();
				if (!result.done && result.value) {
					results2.push((result.value as any).MultiIterator.id);
				}
			})();

			// Trigger event
			handler.Trigger({ id: 42 });

			await Promise.all([promise1, promise2]);

			expect(results1).toEqual([42]);
			expect(results2).toEqual([42]);
		});

		it('should handle error propagation in async iterator subscription', async () => {
			const handler = new EventHandler<{ message: string }, TErrorTestEvent>('ErrorPropagationTest');

			const iterator = handler.GetAsyncIterator();

			// Start a next() call that will be pending
			const nextPromise = iterator.next();

			// No public API exists to error the internal Subject; access it directly.
			// This simulates an unexpected RxJS error reaching the iterator.
			const testError = new Error('Subscription error');
			(handler as any)._Subject.error(testError);

			// The next() call should reject with the error (not resolve to done)
			await expect(nextPromise).rejects.toBe(testError);
		});

		it('should handle error in async iterator subscription with cleanup', async () => {
			const handler = new EventHandler<{ message: string }, TErrorTestEvent>('ErrorCleanupTest');

			// Create iterator which internally subscribes with error handler
			const iterator = handler.GetAsyncIterator();

			// Start a next() call that will be pending
			const nextPromise = iterator.next();

			// No public API exists to error the internal Subject; access it directly.
			const testError = new Error('Iterator subscription error');
			(handler as any)._Subject.error(testError);

			// The iterator should reject with the error
			await expect(nextPromise).rejects.toBe(testError);
		});
	});
});
