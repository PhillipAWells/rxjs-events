
/**
 * @fileoverview Tests for toHaveTriggeredEvent Jest matcher
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

describe('toHaveTriggeredEvent', () => {
	let handler: MockEventHandler<any, ITestEvent>;

	beforeEach(() => {
		handler = new MockEventHandler<any, ITestEvent>('TestEvent');
	});

	describe('TC-MHTE-001 - Event Triggered Without Data Check', () => {
		test('should pass when event is triggered without checking data', () => {
			handler.Trigger({ id: '1', message: 'test' });

			expect(handler).toHaveTriggeredEvent('TestEvent');
		});
	});

	describe('TC-MHTE-002 - Event Triggered With Matching Data', () => {
		test('should pass when event is triggered with matching data', () => {
			const expectedData = { id: '1', message: 'test' };
			handler.Trigger(expectedData);

			expect(handler).toHaveTriggeredEvent('TestEvent', expectedData);
		});
	});

	describe('TC-MHTE-003 - Event Not Triggered (Failure Case)', () => {
		test('should fail when no event has been triggered', () => {
			expect(handler).not.toHaveTriggeredEvent('TestEvent');
		});
	});

	describe('TC-MHTE-004 - Event Triggered With Non-Matching Data', () => {
		test('should fail when event is triggered with non-matching data', () => {
			handler.Trigger({ id: '1', message: 'test' });

			expect(handler).not.toHaveTriggeredEvent('TestEvent', { id: '2', message: 'different' });
		});
	});

	describe('TC-MHTE-005 - Event Triggered With not (Failure with expectedData)', () => {
		test('should fail when using not with matching triggered event and data', () => {
			const expectedData = { id: '1', message: 'test' };
			handler.Trigger(expectedData);

			expect(() => {
				expect(handler).not.toHaveTriggeredEvent('TestEvent', expectedData);
			}).toThrow();
		});
	});

	describe('TC-MHTE-006 - Event Triggered With not (Failure without expectedData)', () => {
		test('should fail when using not with triggered event', () => {
			handler.Trigger({ id: '1', message: 'test' });

			expect(() => {
				expect(handler).not.toHaveTriggeredEvent('TestEvent');
			}).toThrow();
		});
	});

	describe('TC-MHTE-007 - Wrong Event Type Triggered', () => {
		test('should fail when wrong event type is triggered', () => {
			handler.Trigger({ id: '1', message: 'test' });

			expect(handler).not.toHaveTriggeredEvent('WrongEvent');
		});
	});
});
