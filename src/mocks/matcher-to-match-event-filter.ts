import type { MatcherState, SyncExpectationResult } from '@vitest/expect';

/**
 * Vitest matcher to check if an event matches filter criteria
 */
export function ToMatchEventFilter(
	this: MatcherState,
	received: any,
	criteria: Record<string, unknown>,
): SyncExpectationResult {
	// Simple implementation of event filtering logic for testing
	const eventKeys = Object.keys(received);
	if (eventKeys.length === 0) {
		return {

			message: () => 'Expected event to have at least one property',
			pass: false,
		};
	}
	if (eventKeys.length > 1) {
		return {

			message: () => `Expected event to have exactly one property, but got: ${eventKeys.join(', ')}`,
			pass: false,
		};
	}

	const [eventKey] = eventKeys;
	if (!eventKey) {
		return {

			message: () => 'Expected event to have at least one property',
			pass: false,
		};
	}

	const eventData = received[eventKey];
	if (typeof eventData !== 'object' || eventData === null) {
		return {
			 
			message: () => `Expected event data to be an object, but got: ${typeof eventData}`,
			pass: false,
		};
	}

	let pass = true;
	const mismatches: string[] = [];

	for (const [key, expectedValue] of Object.entries(criteria)) {
		if (!(key in eventData)) {
			pass = false;
			mismatches.push(`missing property '${key}'`);
		} else if (!this.equals(eventData[key], expectedValue)) {
			pass = false;
			mismatches.push(`property '${key}': expected ${this.utils.printExpected(expectedValue)}, got ${this.utils.printReceived(eventData[key])}`);
		}
	}

	const message = pass ? `Expected event not to match filter criteria ${this.utils.printExpected(criteria)}` : `Expected event to match filter criteria ${this.utils.printExpected(criteria)}, but had mismatches: ${mismatches.join(', ')}`;

	return {
		 
		message: () => message,
		pass,
	};
}
