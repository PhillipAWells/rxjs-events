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
			Text: () => MOCK_MESSAGE_CONTENT[Math.floor(Math.random() * MOCK_MESSAGE_CONTENT.length)],
			Priority: () => MOCK_PRIORITIES[Math.floor(Math.random() * MOCK_PRIORITIES.length)],
			Channel: () => MOCK_CHANNELS[Math.floor(Math.random() * MOCK_CHANNELS.length)],
		},
	});
}
