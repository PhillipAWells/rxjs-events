
/**
 * @fileoverview Tests for toMatchEventFilter Jest matcher
 */

import { vi } from 'vitest';
import { ToMatchEventFilter } from '../mocks/index.js';
import '../mocks/matchers-setup.js';

describe('toMatchEventFilter', () => {
	describe('TC-MMEF-001 - Valid Event Matches Filter', () => {
		test('should pass when event matches all filter criteria', () => {
			const event = {
				userCreated: {
					id: '123',
					username: 'alice',
					email: 'alice@example.com',
					role: 'admin',
				},
			};

			expect(event).toMatchEventFilter({ role: 'admin' });
		});
	});

	describe('TC-MMEF-002 - Event With Multiple Properties Fails', () => {
		test('should fail when event has multiple properties', () => {
			const event = {
				userCreated: {
					id: '123',
					username: 'alice',
				},
				orderPlaced: {
					orderId: '456',
				},
			};

			expect(event).not.toMatchEventFilter({ role: 'admin' });
		});

		test('should generate correct failure message for multiple properties', () => {
			const event = {
				userCreated: {
					id: '123',
					username: 'alice',
				},
				orderPlaced: {
					orderId: '456',
				},
			};

			const mockContext = {
				equals: vi.fn(),
				utils: { printExpected: vi.fn((x) => JSON.stringify(x)) },
			};

			const result = ToMatchEventFilter.call(mockContext as any, event, { role: 'admin' });

			expect(result.pass).toBe(false);
			expect(result.message()).toContain('Expected event to have exactly one property');
		});
	});

	describe('TC-MMEF-003 - Event With No Properties Fails', () => {
		test('should fail when event has no properties', () => {
			const event = {};

			expect(event).not.toMatchEventFilter({ role: 'admin' });
		});

		test('should generate correct failure message for no properties', () => {
			const event = {};

			const mockContext = {
				equals: vi.fn(),
				utils: { printExpected: vi.fn((x) => JSON.stringify(x)) },
			};

			const result = ToMatchEventFilter.call(mockContext as any, event, { role: 'admin' });

			expect(result.pass).toBe(false);
			expect(result.message()).toContain('Expected event to have at least one property');
		});
	});

	describe('TC-MMEF-004 - Event Data Not Object Fails', () => {
		test('should fail when event data is not an object', () => {
			const event = {
				userCreated: 'not an object',
			};

			expect(event).not.toMatchEventFilter({ role: 'admin' });
		});

		test('should generate correct failure message for non-object data', () => {
			const event = {
				userCreated: 'not an object',
			};

			const mockContext = {
				equals: vi.fn(),
				utils: { printExpected: vi.fn((x) => JSON.stringify(x)) },
			};

			const result = ToMatchEventFilter.call(mockContext as any, event, { role: 'admin' });

			expect(result.pass).toBe(false);
			expect(result.message()).toContain('Expected event data to be an object');
		});
	});

	describe('TC-MMEF-005 - Missing Property In Filter', () => {
		test('should fail when event is missing a property from the filter', () => {
			const event = {
				userCreated: {
					id: '123',
					username: 'alice',
					email: 'alice@example.com',
					// missing 'role' property
				},
			};

			expect(event).not.toMatchEventFilter({ role: 'admin' });
		});

		test('should generate correct failure message for missing property', () => {
			const event = {
				userCreated: {
					id: '123',
					username: 'alice',
					email: 'alice@example.com',
				},
			};

			const mockContext = {
				equals: vi.fn((a, b) => a === b),
				utils: {
					printExpected: vi.fn((x) => JSON.stringify(x)),
					printReceived: vi.fn((x) => JSON.stringify(x)),
				},
			};

			const result = ToMatchEventFilter.call(mockContext as any, event, { role: 'admin' });

			expect(result.pass).toBe(false);
			expect(result.message()).toContain('Expected event to match filter criteria');
		});
	});

	describe('TC-MMEF-006 - Property Value Mismatch', () => {
		test('should fail when event property value does not match filter', () => {
			const event = {
				userCreated: {
					id: '123',
					username: 'alice',
					email: 'alice@example.com',
					role: 'user', // does not match 'admin'
				},
			};

			expect(event).not.toMatchEventFilter({ role: 'admin' });
		});
	});

	describe('TC-MMEF-007 - Valid Event With not (Failure)', () => {
		test('should fail when using not with matching event', () => {
			const event = {
				userCreated: {
					id: '123',
					username: 'alice',
					email: 'alice@example.com',
					role: 'admin',
				},
			};

			expect(() => {
				expect(event).not.toMatchEventFilter({ role: 'admin' });
			}).toThrow();
		});
	});
});
