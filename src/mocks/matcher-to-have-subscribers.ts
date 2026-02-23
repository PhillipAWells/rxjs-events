import type { MatcherState, SyncExpectationResult } from '@vitest/expect';
import type { MockEventHandler } from './mock-handler.js';

/**
 * Vitest matcher to check if a mock handler has the expected number of subscribers
 */
export function ToHaveSubscribers(
	this: MatcherState,
	received: MockEventHandler<any, any>,
	expected: number,
): SyncExpectationResult {
	const actualCount = received.GetSubscriberCount();
	const pass = actualCount === expected;

	return {

		message: () => {
			return pass ? `Expected mock handler not to have ${expected} subscribers, but it had ${actualCount}` : `Expected mock handler to have ${expected} subscribers, but it had ${actualCount}`;
		},
		pass,
	};
}
