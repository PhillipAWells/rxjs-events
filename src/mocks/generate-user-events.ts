import { ArraySample } from '@pawells/typescript-common';
import { GenerateEventData } from './generate-event-data.js';
import { MOCK_USER_NAMES, MOCK_DOMAINS, MOCK_ROLES } from './constants.js';

/**
 * Generates realistic user event data
 *
 * @example
 * ```typescript
 * const events = generateUserEvents(2);
 * // Returns array of user event objects with mock data
 * ```
 *
 * @param count - Number of user events to generate
 * @returns Array of user event objects
 */
const ACTIVE_THRESHOLD = 0.2;

export function GenerateUserEvents(count = 1): Array<{ userCreated: any }> {
	return GenerateEventData('userCreated', {
		count,
		customFields: {
			Username: () => (ArraySample(MOCK_USER_NAMES) ?? 'user').toLowerCase(),
			Email: () => {
				const name = (ArraySample(MOCK_USER_NAMES) ?? 'user').toLowerCase();
				const domain = ArraySample(MOCK_DOMAINS) ?? 'example.com';
				return `${name}@${domain}`;
			},
			Role: () => ArraySample(MOCK_ROLES),

			Active: () => Math.random() > ACTIVE_THRESHOLD,
		},
	});
}
