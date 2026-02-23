import type { TEventData } from '../index.js';
import type { IEventDataGeneratorConfig } from './types.js';
import { GenerateCustomFields } from './generate-custom-fields.js';

/** Milliseconds per second — used when spacing event timestamps apart */
const MS_PER_SECOND = 1000;

/**
 * Generates sample event data for testing
 *
 * @example
 * ```typescript
 * const events = generateEventData('userCreated', 2);
 * // Returns array of event objects with userCreated property
 * ```
 *
 * @param eventType - The type/name of events to generate (use constants from MOCK_EVENT_TYPES).
 *   The value is used verbatim as the event key, matching the behaviour of EventHandler and
 *   MockEventHandler which also use the name as-is.
 * @param countOrConfig - Number of events or full configuration
 * @param config - Additional configuration if first parameter is count
 * @returns Array of generated event objects
 */
export function GenerateEventData<T extends TEventData>(
	eventType: string,
	countOrConfig: number | IEventDataGeneratorConfig = 1,
	config: IEventDataGeneratorConfig = {},
): T[] {
	const finalConfig: Required<IEventDataGeneratorConfig> = {
		// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
		count: typeof countOrConfig === 'number' ? countOrConfig : countOrConfig.count || 1,
		seed: typeof countOrConfig === 'object' ? countOrConfig.seed ?? 'test' : config.seed ?? 'test',
		customFields: typeof countOrConfig === 'object' ? countOrConfig.customFields ?? {} : config.customFields ?? {},
	};

	const events: T[] = [];

	for (let i = 0; i < finalConfig.count; i++) {
		const baseData = {
			id: `${finalConfig.seed}-${i}`,

			timestamp: new Date(Date.now() + (i * MS_PER_SECOND)).toISOString(),
			sequence: i,
			...GenerateCustomFields(finalConfig.customFields),
		};

		const event = {
			[eventType]: baseData,
		} as T;
		events.push(event);
	}

	return events;
}
