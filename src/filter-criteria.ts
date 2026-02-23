/**
 * Filter criteria interface for event filtering.
 * Represents property-value pairs to match against event payloads.
 */
export interface IFilterCriteria {
	[key: string]: unknown;
}
