import type { MatcherState, SyncExpectationResult } from '@vitest/expect';
import type { MockEventHandler } from './mock-handler.js';

/**
 * Vitest matcher to check if a mock handler triggered a specific event
 */
export function ToHaveTriggeredEvent(
	this: MatcherState,
	received: MockEventHandler<any, any>,
	eventType: string,
	expectedData?: any,
): SyncExpectationResult {
	const triggeredEvents = received.GetTriggeredEvents();

	const matchingEvents = triggeredEvents.filter((event) => {
		const hasEventType = eventType in event;
		if (!hasEventType) return false;

		if (expectedData === undefined) return true;

		const eventData = event[eventType as keyof typeof event];
		return this.equals(eventData, expectedData);
	});

	const pass = matchingEvents.length > 0;

	return {

		message: () => {
			if (expectedData !== undefined) {
				return pass ? `Expected mock handler not to have triggered event '${eventType}' with data ${this.utils.printExpected(expectedData)}` : `Expected mock handler to have triggered event '${eventType}' with data ${this.utils.printExpected(expectedData)}, but ${
					triggeredEvents.length === 0 ? 'no events were triggered' : `only triggered: ${this.utils.printReceived(triggeredEvents)}`
				}`;
			} else {
				return pass ? `Expected mock handler not to have triggered event '${eventType}'` : `Expected mock handler to have triggered event '${eventType}', but ${
					triggeredEvents.length === 0 ? 'no events were triggered' : `only triggered: ${this.utils.printReceived(triggeredEvents.map((e) => Object.keys(e)[0]))}`
				}`;
			}
		},
		pass,
	};
}
