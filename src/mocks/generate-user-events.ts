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
			Username: () => MOCK_USER_NAMES[Math.floor(Math.random() * MOCK_USER_NAMES.length)]?.toLowerCase() ?? 'user',
			Email: () => {
				const name = MOCK_USER_NAMES[Math.floor(Math.random() * MOCK_USER_NAMES.length)]?.toLowerCase() ?? 'user';
				const domain = MOCK_DOMAINS[Math.floor(Math.random() * MOCK_DOMAINS.length)] ?? 'example.com';
				return `${name}@${domain}`;
			},
			Role: () => MOCK_ROLES[Math.floor(Math.random() * MOCK_ROLES.length)],

			Active: () => Math.random() > ACTIVE_THRESHOLD,
		},
	});
}
