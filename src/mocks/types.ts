/**
 * @fileoverview Type definitions for event mocks and test utilities
 */

import type { TEventFunction } from '../index.js';

/**
 * Configuration options for mock event handlers
 */
export interface IMockEventHandlerConfig {
	/**
	 * Whether to simulate async (setTimeout-based) event delivery.
	 * Has no effect unless `delay` is also set to a value greater than 0.
	 */
	asyncMode?: boolean;
	/**
	 * Delay in milliseconds between Trigger() and handler invocation.
	 * Only applied when `asyncMode` is true. Defaults to 0 (synchronous delivery).
	 */
	delay?: number;
	/** Maximum number of subscribers to allow */
	maxSubscribers?: number;
	/** Whether to track subscription calls */
	trackCalls?: boolean;
}

/**
 * Mock subscription tracking information
 */
export interface IMockSubscription {
	/** Unique subscription ID */
	id: number;
	/** The event handler function */
	handler: TEventFunction<any>;
	/** Timestamp when subscription was created */
	createdAt: Date;
	/** Whether the subscription is active */
	active: boolean;
}

/**
 * Configuration for event data generation
 */
export interface IEventDataGeneratorConfig {
	/** Number of events to generate */
	count?: number;
	/** Seed for deterministic generation */
	seed?: string;
	/** Custom field generators */
	customFields?: Record<string, () => unknown>;
}

/**
 * Mock observable configuration
 */
export interface IMockObservableConfig<T> {
	/** Data items to emit */
	data: T[];
	/** Delay between emissions in milliseconds */
	emissionDelay?: number;
	/** Whether to complete after all data is emitted */
	autoComplete?: boolean;
	/** Whether to emit errors */
	shouldError?: boolean;
	/** Error to emit if shouldError is true */
	error?: Error;
	/** Timeout for waiting for new data in milliseconds */
	timeout?: number;
	/** AbortSignal for cancellation */
	abortSignal?: AbortSignal;
}

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

/**
 * Configuration for mock event generation
 */
export interface IMockConfig {
	/** Maximum number of events to generate */
	maxEvents?: number;
	/** Minimum delay between events (ms) */
	minDelay?: number;
	/** Maximum delay between events (ms) */
	maxDelay?: number;
	/** Whether to include timestamps in events */
	includeTimestamps?: boolean;
}

/**
 * Mock event data structure
 */
export interface IMockEventData {
	/** Event type identifier */
	type: string;
	/** Event payload */
	payload: unknown;
	/** Event timestamp (optional) */
	timestamp?: number;
}

declare module '@vitest/expect' {
	interface Assertion<T = any> extends ICustomMatchers<T> {}
	interface AsymmetricMatchersContaining extends ICustomMatchers {}
}
