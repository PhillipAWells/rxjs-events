import { TEventData } from './event-data.js';

/**
 * Type to extract the payload type from an event.
 * Takes the first (and only) property value from an TEventData object.
 */
export type TExtractEventPayload<TEvent extends TEventData> = TEvent[keyof TEvent];
