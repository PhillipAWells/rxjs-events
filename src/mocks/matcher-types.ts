/**
 * @fileoverview Type definitions for custom Vitest matchers
 */

/**
 * Vitest matcher extensions for event testing
 */
export interface ICustomMatchers<R = unknown> {
	/**
	 * Check if mock handler has specified number of subscribers
	 */
	toHaveSubscribers(count: number): R;
	/**
	 * Check if mock handler triggered an event
	 */
	toHaveTriggeredEvent(eventType: string, data?: any): R;
	/**
	 * Check if event matches filter criteria
	 */
	toMatchEventFilter(criteria: Record<string, unknown>): R;
}

declare module 'vitest' {
	// Custom matchers declared in types.ts
}
