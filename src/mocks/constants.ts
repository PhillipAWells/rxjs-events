/**
 * Mock data constants for event testing
 */

/**
 * Pool of sample user names for mock events
 */
export const MOCK_USER_NAMES: readonly string[] = Object.freeze([
	'Alice',
	'Bob',
	'Charlie',
	'Diana',
	'Eve',
	'Frank',
	'Grace',
	'Henry',
]);

/**
 * Pool of sample message content for mock events
 */
export const MOCK_MESSAGE_CONTENT: readonly string[] = Object.freeze([
	'Hello, world!',
	'Test message',
	'Sample content',
	'Mock data',
	'Event payload',
]);

/**
 * Pool of sample event types
 */
export const MOCK_EVENT_TYPES: readonly string[] = Object.freeze([
	'user.created',
	'user.updated',
	'user.deleted',
	'message.sent',
	'message.received',
]);

/**
 * Pool of sample status values
 */
export const MOCK_STATUS_VALUES: readonly string[] = Object.freeze([
	'active',
	'inactive',
	'pending',
	'completed',
	'failed',
]);

/**
 * Pool of sample domain names for mock emails
 */
export const MOCK_DOMAINS: readonly string[] = Object.freeze([
	'example.com',
	'test.org',
	'demo.net',
	'sample.io',
]);

/**
 * Pool of sample user roles
 */
export const MOCK_ROLES: readonly string[] = Object.freeze([
	'user',
	'admin',
	'moderator',
	'guest',
]);

/**
 * Pool of sample message priorities
 */
export const MOCK_PRIORITIES: readonly string[] = Object.freeze([
	'low',
	'normal',
	'high',
]);

/**
 * Pool of sample channel names
 */
export const MOCK_CHANNELS: readonly string[] = Object.freeze([
	'#general',
	'#random',
	'#dev',
	'#support',
]);

/**
 * Default mock configuration
 */
export const DEFAULT_MOCK_CONFIG = Object.freeze({
	maxEvents: 100,
	minDelay: 0,
	maxDelay: 1000,
	includeTimestamps: true,
});
