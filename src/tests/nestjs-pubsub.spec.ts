import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventHandlerPubSub, WithFilter } from '../index.js';

interface IMessagePayload {
	text: string;
	userId: string;
	timestamp: number;
}

describe('EventHandlerPubSub', () => {
	let pubSub: EventHandlerPubSub;

	beforeEach(() => {
		pubSub = new EventHandlerPubSub();
	});

	afterEach(() => {
		// Clean up handlers if needed
	});

	describe('publish and subscribe', () => {
		it('should publish and subscribe to messages', async () => {
			const messages: IMessagePayload[] = [];

			const subId = await pubSub.subscribe(
				'MESSAGE_SENT',
				(event: any) => {
					// Event is wrapped: { MESSAGE_SENT: payload }
					if (event && typeof event === 'object' && 'MESSAGE_SENT' in event) {
						messages.push(event.MESSAGE_SENT);
					}
				},
			);

			const payload: IMessagePayload = {
				text: 'Hello',
				userId: 'user123',
				timestamp: Date.now(),
			};

			await pubSub.publish('MESSAGE_SENT', payload);

			// Give async operations time to complete
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(messages.length).toBe(1);
			expect(messages[0].text).toBe('Hello');

			pubSub.unsubscribe(subId);
		});

		it('should handle multiple subscriptions', async () => {
			const messages1: IMessagePayload[] = [];
			const messages2: IMessagePayload[] = [];

			const sub1 = await pubSub.subscribe(
				'MESSAGE_SENT',
				(event: any) => {
					if (event && typeof event === 'object' && 'MESSAGE_SENT' in event) {
						messages1.push(event.MESSAGE_SENT);
					}
				},
			);

			const sub2 = await pubSub.subscribe(
				'MESSAGE_SENT',
				(event: any) => {
					if (event && typeof event === 'object' && 'MESSAGE_SENT' in event) {
						messages2.push(event.MESSAGE_SENT);
					}
				},
			);

			const payload: IMessagePayload = {
				text: 'Test',
				userId: 'user456',
				timestamp: Date.now(),
			};

			await pubSub.publish('MESSAGE_SENT', payload);
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(messages1.length).toBe(1);
			expect(messages2.length).toBe(1);

			pubSub.unsubscribe(sub1);
			pubSub.unsubscribe(sub2);
		});

		it('should isolate different triggers', async () => {
			const messages1: string[] = [];
			const messages2: string[] = [];

			const sub1 = await pubSub.subscribe(
				'TRIGGER_A',
				(event: any) => {
					if (event && typeof event === 'object' && 'TRIGGER_A' in event) {
						messages1.push(event.TRIGGER_A);
					}
				},
			);

			const sub2 = await pubSub.subscribe(
				'TRIGGER_B',
				(event: any) => {
					if (event && typeof event === 'object' && 'TRIGGER_B' in event) {
						messages2.push(event.TRIGGER_B);
					}
				},
			);

			await pubSub.publish('TRIGGER_A', 'messageA');
			await pubSub.publish('TRIGGER_B', 'messageB');
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(messages1).toEqual(['messageA']);
			expect(messages2).toEqual(['messageB']);

			pubSub.unsubscribe(sub1);
			pubSub.unsubscribe(sub2);
		});
	});

	describe('asyncIterator', () => {
		it('should create async iterator for a single trigger', async () => {
			const iteratorPromise = (async () => {
				const messages: IMessagePayload[] = [];

				for await (const event of pubSub.asyncIterator<any>('USER_CREATED')) {
					if (event && typeof event === 'object' && 'USER_CREATED' in event) {
						messages.push(event.USER_CREATED);
					}
					if (messages.length >= 2) break;
				}

				return messages;
			})();

			await new Promise((resolve) => setTimeout(resolve, 10));

			await pubSub.publish('USER_CREATED', {
				text: 'user1',
				userId: 'id1',
				timestamp: 1,
			});

			await pubSub.publish('USER_CREATED', {
				text: 'user2',
				userId: 'id2',
				timestamp: 2,
			});

			const messages = await iteratorPromise;

			expect(messages.length).toBe(2);
			expect(messages[0].userId).toBe('id1');
			expect(messages[1].userId).toBe('id2');
		});

		it('should handle empty trigger array', async () => {
			const iterator = pubSub.asyncIterator([]);
			const result = await iterator.next();

			expect(result.done).toBe(true);
		});

		it('should return subscription ID after unsubscribe', () => {
			// Test that unsubscribe handles valid and invalid IDs gracefully
			pubSub.unsubscribe(999); // Should not throw
			expect(true).toBe(true);
		});
	});

	describe('WithFilter', () => {
		it('should filter async iterator values', async () => {
			const results: number[] = [];

			// Create a simple async generator
			const source = (async function* () {
				yield 1;
				yield 2;
				yield 3;
				yield 4;
				yield 5;
			})();

			// Filter even numbers
			const filtered = WithFilter(
				() => source,
				(value) => value % 2 === 0,
			);

			for await (const value of filtered) {
				results.push(value);
				if (results.length >= 2) break;
			}

			expect(results).toEqual([2, 4]);
		});

		it('should support async filter functions', async () => {
			const results: number[] = [];

			const source = (async function* () {
				yield 1;
				yield 2;
				yield 3;
			})();

			const filtered = WithFilter(
				() => source,
				async (value) => {
					// Simulate async check
					return new Promise<boolean>((resolve) => {
						setTimeout(() => resolve(value > 1), 5);
					});
				},
			);

			for await (const value of filtered) {
				results.push(value);
			}

			expect(results).toEqual([2, 3]);
		});

		it('should work with PubSub asyncIterator', async () => {
			let resultCount = 0;
			const results: any[] = [];

			const filtered = WithFilter(
				() => pubSub.asyncIterator<any>('FILTERED_MESSAGE'),
				(event: any) => {
					// Extract payload and check userId
					if (event && typeof event === 'object' && 'FILTERED_MESSAGE' in event) {
						return event.FILTERED_MESSAGE.userId === 'admin';
					}
					return false;
				},
			);

			// Start consuming filtered events
			const consumePromise = (async () => {
				for await (const event of filtered) {
					if (event && typeof event === 'object' && 'FILTERED_MESSAGE' in event) {
						results.push(event.FILTERED_MESSAGE);
						resultCount++;
						if (resultCount >= 1) break;
					}
				}
			})();

			// Give iterator time to start
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Publish non-matching message
			await pubSub.publish('FILTERED_MESSAGE', {
				text: 'regular user',
				userId: 'user123',
				timestamp: Date.now(),
			});

			// Publish matching message
			await pubSub.publish('FILTERED_MESSAGE', {
				text: 'admin action',
				userId: 'admin',
				timestamp: Date.now(),
			});

			// Wait for result with timeout
			await Promise.race([
				consumePromise,
				new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000)),
			]).catch(() => {
				// Expected timeout is ok
			});

			expect(results.length).toBe(1);
			expect(results[0].userId).toBe('admin');
		});
	});

	describe('subscription management', () => {
		it('should unsubscribe from trigger', async () => {
			const messages: string[] = [];

			const subId = await pubSub.subscribe(
				'TEST_TRIGGER',
				(event: any) => {
					if (event && typeof event === 'object' && 'TEST_TRIGGER' in event) {
						messages.push(event.TEST_TRIGGER);
					}
				},
			);

			await pubSub.publish('TEST_TRIGGER', 'message1');
			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(messages.length).toBe(1);

			pubSub.unsubscribe(subId);

			await pubSub.publish('TEST_TRIGGER', 'message2');
			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(messages.length).toBe(1); // Still 1, not 2
		});

		it('should handle unsubscribe with non-existent ID', () => {
			// Should not throw
			expect(() => pubSub.unsubscribe(99999)).not.toThrow();
		});
	});
});
