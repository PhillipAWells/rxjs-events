/**
 * @fileoverview Main entry point for @pawells/rxjs-events mocks package
 * Exports all mock utilities and test helpers for event-driven testing scenarios
 */

// Export all mock implementations
export * from './mock-handler.js';
export * from './mock-observable.js';

// Export types
export * from './types.js';

// Export constants
export {
	MOCK_USER_NAMES,
	MOCK_MESSAGE_CONTENT,
	MOCK_EVENT_TYPES,
	MOCK_STATUS_VALUES,
	MOCK_DOMAINS,
	MOCK_ROLES,
	MOCK_PRIORITIES,
	MOCK_CHANNELS,
	DEFAULT_MOCK_CONFIG,
} from './constants.js';

// Export specific types
export type { IMockConfig, IMockEventData } from './types.js';

// Export generators
export * from './generate-custom-fields.js';
export * from './generate-event-data.js';
export * from './generate-filter-criteria.js';
export * from './generate-message-events.js';
export * from './generate-subscription-scenarios.js';
export * from './generate-user-events.js';

// Export matchers
export * from './matcher-to-have-subscribers.js';
export * from './matcher-to-have-triggered-event.js';
export * from './matcher-to-match-event-filter.js';
export * from './matchers-setup.js';
