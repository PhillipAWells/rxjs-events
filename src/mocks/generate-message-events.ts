import { ArraySample } from '@pawells/typescript-common';
import { GenerateEventData } from './generate-event-data.js';
import { MOCK_MESSAGE_CONTENT, MOCK_PRIORITIES, MOCK_CHANNELS } from './constants.js';

/**
 * Generates message event data
 *
 * @example
 * ```typescript
 * const events = generateMessageEvents(3);
 * // Returns array of message event objects with mock content
 * ```
 *
 * @param count - Number of message events to generate
 * @returns Array of message event objects
 */
export function GenerateMessageEvents(count = 1): Array<{ messageReceived: any }> {
	return GenerateEventData('messageReceived', {
		count,
		customFields: {
			Text: () => ArraySample(MOCK_MESSAGE_CONTENT),
			Priority: () => ArraySample(MOCK_PRIORITIES),
			Channel: () => ArraySample(MOCK_CHANNELS),
		},
	});
}
