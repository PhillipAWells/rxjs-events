
import { TEventData , EventFilter } from '../index.js';

// Define test event interfaces
type TUserCreatedEvent = TEventData & {
	UserCreated: {
		userId: string;
		username: string;
		email: string;
		role: string;
	};
};
type TItemUpdatedEvent = TEventData & {
	ItemUpdated: {
		isActive: boolean;
		itemId: number;
		name: string;
		quantity: number;
	};
};
describe('EventFilter', () => {
	it('should correctly filter events with simple criteria', () => {
		// Create test data
		const event = {
			TestEvent: {
				active: true,
				id: 123,
				name: 'test',
			},
		};
		// Test with matching criteria
		expect(EventFilter(event, { id: 123 })).toBe(true);

		// Test with non-matching criteria
		expect(EventFilter(event, { id: 456 })).toBe(false);

		// Test with multiple criteria - all match
		expect(EventFilter(event, { id: 123, name: 'test' })).toBe(true);

		// Test with multiple criteria - partial match (should fail)
		expect(EventFilter(event, { id: 123, name: 'wrong' })).toBe(false);

		// Test with null/undefined filter (should pass)
		expect(EventFilter(event, null)).toBe(true);
		expect(EventFilter(event, null)).toBe(true);

		// Test with empty object filter (should pass)
		expect(EventFilter(event, {})).toBe(true);

		// Test type comparisons
		expect(EventFilter(event, { active: true })).toBe(true);
		expect(EventFilter(event, { active: 'true' })).toBe(false);
		expect(EventFilter(event, { active: 'true' })).toBe(false);
	});

	it('should match events when filter criteria match the event payload', () => {
		const event: TUserCreatedEvent = {
			UserCreated: {
				email: 'test@example.com',
				role: 'admin',
				userId: '123',
				username: 'testuser',
			},
		};

		const filterArgs = { role: 'admin', username: 'testuser' };
		expect(EventFilter(event, filterArgs)).toBe(true);
	});

	it('should not match events when filter criteria don\'t match payload', () => {
		const event: TUserCreatedEvent = {
			UserCreated: {
				email: 'test@example.com',
				role: 'admin',
				userId: '123',
				username: 'testuser',
			},
		};

		const filterArgs = { role: 'user', username: 'testuser' };
		expect(EventFilter(event, filterArgs)).toBe(false);
	});

	it('should return true for null or undefined filter criteria', () => {
		const event: TUserCreatedEvent = {
			UserCreated: {
				email: 'test@example.com',
				role: 'admin',
				userId: '123',
				username: 'testuser',
			},
		};
		expect(EventFilter(event, null)).toBe(true);
		expect(EventFilter(event, null)).toBe(true);
	});

	it('should throw an error for null or undefined events', () => {
		expect(() => EventFilter(null as any, { prop: 'value' })).toThrow('No Event');
		expect(() => EventFilter(null as any, { prop: 'value' })).toThrow('No Event');
	});

	it('should throw an error when event has no keys', () => {
		expect(() => EventFilter({} as any, { prop: 'value' })).toThrow('Event object must have exactly one top-level key, but received an empty object ({}).');
	});

	it('should throw an error when event has more than one key', () => {
		const invalidEvent = {
			FirstKey: { prop: 'value' },
			SecondKey: { prop: 'value' },
		};
		expect(() => EventFilter(invalidEvent as any, { prop: 'value' })).toThrow('More than one payload structure.');
	});

	it('should throw an error when event has no payload', () => {
		const eventWithNoPayload = {
			EmptyPayload: null,
		};
		expect(() => EventFilter(eventWithNoPayload as any, { prop: 'value' })).toThrow('No Payload');
	});

	it('should throw an error when event key is undefined', () => {
		// Create an event with exactly one key but with undefined payload
		const mockEvent = { singleKey: null };
		// This should throw the "No Payload" error we're expecting
		expect(() => {
			EventFilter(mockEvent as any, { prop: 'value' });
		}).toThrow('No Payload');
	});

	it('should return true for empty objects and empty filter criteria', () => {
		const event = {
			EmptyEvent: {},
		};
		expect(EventFilter(event as any, {})).toBe(true);
	});

	it('should return true when filter args is an empty object', () => {
		const event: TUserCreatedEvent = {
			UserCreated: {
				email: 'test@example.com',
				role: 'admin',
				userId: '123',
				username: 'testuser',
			},
		};
		expect(EventFilter(event, {})).toBe(true);
	});

	it('should work correctly with different event types', () => {
		const userEvent: TUserCreatedEvent = {
			UserCreated: {
				email: 'test@example.com',
				role: 'admin',
				userId: '123',
				username: 'testuser',
			},
		};

		const itemEvent: TItemUpdatedEvent = {
			ItemUpdated: {
				isActive: true,
				itemId: 456,
				name: 'Test Item',
				quantity: 10,
			},
		};
		expect(EventFilter(userEvent, { username: 'testuser' })).toBe(true);
		expect(EventFilter(itemEvent, { isActive: true, itemId: 456 })).toBe(true);
		expect(EventFilter(itemEvent, { isActive: false, itemId: 456 })).toBe(false);
	});

	it('should strictly compare values of different types', () => {
		const event: TItemUpdatedEvent = {
			ItemUpdated: {
				isActive: true,
				itemId: 456,
				name: 'Test Item',
				quantity: 10,
			},
		};
		// Number comparison
		expect(EventFilter(event, { itemId: 456 })).toBe(true);
		expect(EventFilter(event, { itemId: '456' })).toBe(false);

		// Boolean comparison
		expect(EventFilter(event, { isActive: true })).toBe(true);
		expect(EventFilter(event, { isActive: 'true' })).toBe(false);
		expect(EventFilter(event, { isActive: 1 })).toBe(false);
	});

	it('should not support filtering by nested properties', () => {
		const event = {
			ComplexEvent: {
				user: {
					details: {
						name: 'Test User',
					},
					id: '123',
				},
			},
		};
		// This will return false as the filter tries to match a top-level property named "user.details.name"
		expect(EventFilter(event as any, { 'user.details.name': 'Test User' })).toBe(false);
	});
});
