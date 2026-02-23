
/**
 * @fileoverview Tests for toHaveSubscribers Jest matcher
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

describe('toHaveSubscribers', () => {
	let handler: MockEventHandler<any, ITestEvent>;

	beforeEach(() => {
		handler = new MockEventHandler<any, ITestEvent>('TestEvent');
	});

	describe('TC-MHS-001 - Matcher Passes', () => {
		test('should pass when handler has exactly the expected number of subscribers', async () => {
			// Subscribe 2 handlers
			await handler.Subscribe(() => {});
			await handler.Subscribe(() => {});

			expect(handler).toHaveSubscribers(2);
		});
	});

	describe('TC-MHS-002 - Matcher Fails (Too Few Subscribers)', () => {
		test('should fail when handler has fewer subscribers than expected', async () => {
			// Subscribe 1 handler
			await handler.Subscribe(() => {});

			expect(handler).not.toHaveSubscribers(2);
		});
	});

	describe('TC-MHS-003 - Matcher Fails (Too Many Subscribers)', () => {
		test('should fail when handler has more subscribers than expected', async () => {
			// Subscribe 3 handlers
			await handler.Subscribe(() => {});
			await handler.Subscribe(() => {});
			await handler.Subscribe(() => {});

			expect(handler).not.toHaveSubscribers(2);
		});
	});

	describe('TC-MHS-004 - Matcher Fails (Exact Match with not)', () => {
		test('should fail when using not with exact match', async () => {
			// Subscribe 2 handlers
			await handler.Subscribe(() => {});
			await handler.Subscribe(() => {});

			expect(() => {
				expect(handler).not.toHaveSubscribers(2);
			}).toThrow();
		});
	});
});
