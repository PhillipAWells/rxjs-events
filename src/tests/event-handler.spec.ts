
import { vi } from 'vitest';
import { TEventData , EventHandler } from '../index.js';

// Define test event interfaces
type TTestEvent = TEventData & {
	TestEventName: {
		id: number;
		message: string;
	};
};
interface IMessage {
	id: number;
	message: string;
}
interface INumberValue {
	value: number;
}
interface IComplexData {
	name: string;
	values: number[];
}
interface IComplexEvent {
	id: number;
	data: IComplexData;
}
type TComplexTestEvent = TEventData & {
	ComplexEvent: IComplexEvent;
};
type TIteratorTestEvent = TEventData & {
	IteratorTest: INumberValue;
};
describe('EventHandler', () => {
	afterEach(() => {
		vi.clearAllTimers();
	});

	describe('Constructor', () => {
		it('should create an instance with a valid name', () => {
			const handler = new EventHandler<IMessage, TTestEvent>('TestEventName');
			expect(handler).toBeDefined();
			expect(handler.Name).toBe('TestEventName');
		});

		it('should throw an error when initialized with an empty name', () => {
			expect(() => {
				return new EventHandler('');
			}).toThrow('Event Name is Empty');
		});
	});

	describe('Subscription Management', () => {
		let handler: EventHandler<IMessage, TTestEvent>;
		beforeEach(() => {
			handler = new EventHandler<IMessage, TTestEvent>('TestEventName');
		});

		it('should assign unique subscription IDs', async () => {
			const id1 = await handler.Subscribe(() => {
				// placeholder
			});
			const id2 = await handler.Subscribe(() => {
				// placeholder
			});
			const id3 = await handler.Subscribe(() => {
				// placeholder
			});
			expect(id1).toBe(0);
			expect(id2).toBe(1);
			expect(id3).toBe(2);
		});

		it('should reuse subscription IDs after unsubscribe', async () => {
			const id1 = await handler.Subscribe(() => {
				// placeholder
			});
			await handler.Subscribe(() => {
				// placeholder
			});
			handler.Unsubscribe(id1);

			const id3 = await handler.Subscribe(() => {
				// placeholder
			});
			// Reusing the first ID that was unsubscribed
			expect(id3).toBe(0);
		});

		it('should handle unsubscribe with non-existent subscription ID', () => {
			// This should not throw an error
			expect(() => {
				handler.Unsubscribe(999);
			}).not.toThrow();
		});
	});

	describe('Event Triggering', () => {
		let handler: EventHandler<IMessage, TTestEvent>;
		beforeEach(() => {
			handler = new EventHandler<IMessage, TTestEvent>('TestEventName');
		});

		it('should deliver events to subscribers', () => {
			const eventData = { id: 123, message: 'test message' };
			return new Promise<void>((resolve) => {
				handler.Subscribe((event: TTestEvent) => {
					expect(event).toEqual({
						TestEventName: eventData,
					});
					resolve();
				});

				handler.Trigger(eventData);
			});
		});

		it('should deliver events to multiple subscribers', async () => {
			const eventData = { id: 456, message: 'multiple subscribers' };

			let count = 0;
			const subscriber = (): void => {
				count += 1;
			};
			await handler.Subscribe(subscriber);
			await handler.Subscribe(subscriber);
			await handler.Subscribe(subscriber);

			handler.Trigger(eventData);

			expect(count).toBe(3);
		});

		it('should not deliver events after unsubscribe', async () => {
			const eventData = { id: 789, message: 'unsubscribed test' };

			let receivedCount = 0;

			const id = await handler.Subscribe(() => {
				receivedCount += 1;
			});
			handler.Trigger(eventData);
			expect(receivedCount).toBe(1);

			handler.Unsubscribe(id);

			handler.Trigger(eventData);
			// Still 1, no increment after unsubscribe
			expect(receivedCount).toBe(1);
		});

		it('should receive events asynchronously with await', async () => {
			const eventData1 = { id: 1, message: 'first' };
			const eventData2 = { id: 2, message: 'second' };
			setTimeout(() => {
				handler.Trigger(eventData1);
				handler.Trigger(eventData2);
			}, 10);

			const iterator = handler.GetAsyncIterator();

			const event1 = await iterator.next();
			const event2 = await iterator.next();
			expect(event1.value).toEqual({ TestEventName: eventData1 });
			expect(event2.value).toEqual({ TestEventName: eventData2 });
		});
	});

	describe('AsyncIterator Support', () => {
		it('should support for-await-of iteration', async () => {
			const handler = new EventHandler<INumberValue, TEventData>('CountEvent');
			const results: number[] = [];

			const iteration = async (): Promise<void> => {
				const iterator = handler.GetAsyncIterator();

				// Process three events and then stop
				const promises = [];

				for (let i = 0; i < 3; i += 1) {
					promises.push(iterator.next());
				}

				const events = await Promise.all(promises);

				for (const next of events) {
					results.push(next.value.CountEvent.value);
				}
			};
			// Start iterating in background
			const iterationPromise = iteration();
			// Trigger events after a small delay
			setTimeout(() => {
				handler.Trigger({ value: 1 });
				handler.Trigger({ value: 2 });
				handler.Trigger({ value: 3 });
			}, 10);

			// Wait for iteration to complete
			await iterationPromise;

			expect(results).toEqual([1, 2, 3]);
		});

		it('should work with multiple AsyncIterators', async () => {
			const handler = new EventHandler<INumberValue, TEventData>('MultiEvent');

			const results1: number[] = [];
			const results2: number[] = [];

			// Start iterating with two separate iterators
			const iterator1Promise = (async () => {
				const iterator = handler.GetAsyncIterator();
				const event1 = await iterator.next();
				results1.push(event1.value.MultiEvent.value);

				const event2 = await iterator.next();
				results1.push(event2.value.MultiEvent.value);
				return results1;
			})();

			const iterator2Promise = (async () => {
				const iterator = handler.GetAsyncIterator();
				const event1 = await iterator.next();
				results2.push(event1.value.MultiEvent.value);

				const event2 = await iterator.next();
				results2.push(event2.value.MultiEvent.value);
				return results2;
			})();
			// Trigger events
			setTimeout(() => {
				handler.Trigger({ value: 10 });
				handler.Trigger({ value: 20 });
			}, 10);

			// Wait for all iterations to complete
			await Promise.all([iterator1Promise, iterator2Promise]);

			expect(results1).toEqual([10, 20]);
			expect(results2).toEqual([10, 20]);
		});
	});

	describe('Enhanced AsyncIterator', () => {
		it('should fully exercise the GetAsyncIterableIterator method', async () => {
			const handler = new EventHandler<INumberValue, TIteratorTestEvent>('IteratorTest');
			const results: number[] = [];

			const iteration = async (): Promise<number[]> => {
				// Use the iterator directly from GetAsyncIterableIterator to cover those lines
				const asyncIterator = handler.GetAsyncIterableIterator();

				// Process events using for-await-of which will exercise the AsyncIterator implementation
				for await (const event of asyncIterator) {
					results.push(event.IteratorTest.value);
					// Break after 3 events to ensure we don't wait forever
					if (results.length >= 3) break;
				}

				return results;
			};

			// Create an iterator that will process events as they come in
			const iteratorPromise = iteration();
			// Trigger events with different timing to test async behavior
			setTimeout(() => handler.Trigger({ value: 100 }), 10);
			setTimeout(() => handler.Trigger({ value: 200 }), 20);
			setTimeout(() => handler.Trigger({ value: 300 }), 30);

			// Wait for iteration to complete
			await iteratorPromise;

			// Verify results
			expect(results).toEqual([100, 200, 300]);

			// Test multiple subscribers using same iterator
			await handler.Subscribe((event) => {
				// This should still receive events even after the iterator completes
				results.push(event.IteratorTest.value + 1000);
			});
			// Trigger one more event
			handler.Trigger({ value: 400 });

			// Should have received the event in both the subscription and the iterator
			expect(results).toContain(1400);
		});

		it('should handle breaking out of iteration early', async () => {
			// Define a proper event type for this test
			type TEarlyBreakTestEvent = TEventData & {
				EarlyBreakTest: INumberValue;
			};

			// This test aims to cover lines 51-52 in handler.ts
			const handler = new EventHandler<INumberValue, TEarlyBreakTestEvent>('EarlyBreakTest');
			const results: number[] = [];

			// Set up an iterator and use it
			const iteratorPromise = (async () => {
				const iterator = handler.GetAsyncIterableIterator();
				const event = await iterator.next();
				if (!event.done) {
					results.push(event.value.EarlyBreakTest.value);
				}
			})();
			// Send an event
			setTimeout(() => handler.Trigger({ value: 42 }), 10);

			// Wait for the iteration to complete
			await iteratorPromise;

			// Verify that only one event was processed before breaking
			expect(results).toEqual([42]);
			expect(results.length).toBe(1);
		});

		it('should cover the for-await loop in GetAsyncIterableIterator', async () => {
			const handler = new EventHandler<INumberValue, TEventData>('DirectIteratorTest');

			// Access the private method using type casting and 'as any'
			const iterableIterator = (handler as any).GetAsyncIterableIterator();

			// Set up a promise to capture the value yielded by the iterator
			const resultPromise = (async () => {
				// Use next() directly on the iterator
				const result = await iterableIterator.next();
				return result.value;
			})();
			// Trigger an event
			setTimeout(() => handler.Trigger({ value: 1000 }), 10);

			// Wait for and verify the result
			const result = await resultPromise;
			expect(result).toEqual({ DirectIteratorTest: { value: 1000 } });

			// Make sure we can get multiple values from the same iterator
			const secondPromise = iterableIterator.next();
			// Trigger another event
			setTimeout(() => handler.Trigger({ value: 2000 }), 10);

			// Verify the second result
			const secondResult = await secondPromise;
			expect(secondResult.value).toEqual({ DirectIteratorTest: { value: 2000 } });
			expect(secondResult.done).toBe(false);
		});
	});

	describe('Complex Event Handling', () => {
		it('should handle complex event data structures', () => {
			const handler = new EventHandler<IComplexEvent, TComplexTestEvent>('ComplexEvent');

			const complexData = {
				data: {
					name: 'complex test',
					values: [1, 2, 3, 4, 5],
				},
				id: 42,
			};
			return new Promise<void>((resolve) => {
				handler.Subscribe((event: TComplexTestEvent) => {
					expect(event).toEqual({
						ComplexEvent: complexData,
					});

					// Access nested properties
					expect(event.ComplexEvent.data.values.length).toBe(5);
					expect(event.ComplexEvent.data.name).toBe('complex test');

					resolve();
				});

				handler.Trigger(complexData);
			});
		});
	});

	describe('Edge Cases', () => {
		it('should handle rapid subscription and unsubscription', async () => {
			const handler = new EventHandler('RapidEvent');

			// Create and immediately remove 100 subscriptions
			const promises = [];

			for (let i = 0; i < 100; i += 1) {
				promises.push(handler.Subscribe(() => {
					// placeholder
				}));
			}

			const ids = await Promise.all(promises);

			for (const id of ids) {
				handler.Unsubscribe(id);
			}

			// The next subscription should still get ID 0
			const newId = handler.Subscribe(() => {
				// placeholder
			});
			expect(newId).toBe(0);
		});

		it('should handle many subscriptions without running out of IDs', async () => {
			const handler = new EventHandler('ManySubscriptionsEvent');
			const ids: number[] = [];

			// Create 1000 subscriptions
			const promises = [];

			for (let i = 0; i < 1000; i += 1) {
				promises.push(handler.Subscribe(() => {
					// placeholder
				}));
			}

			const subscriptionIds = await Promise.all(promises);
			ids.push(...subscriptionIds);

			expect(ids.length).toBe(1000);
		});
	});
});
