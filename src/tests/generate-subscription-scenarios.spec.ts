
import { DEFAULT_MOCK_CONFIG } from '../mocks/constants.js';
import { GenerateSubscriptionScenarios } from '../mocks/generate-subscription-scenarios.js';

describe('GenerateSubscriptionScenarios', () => {
	describe('TC-GSS-001 - Default Scenario Generation', () => {
		it('should generate default number of scenarios', () => {
			const result = GenerateSubscriptionScenarios();

			expect(result).toHaveLength(5);
			result.forEach(scenario => {
				expect(scenario).toHaveProperty('name');
				expect(scenario).toHaveProperty('subscriberCount');
				expect(scenario).toHaveProperty('eventCount');
				expect(scenario).toHaveProperty('async');
				expect(typeof scenario.name).toBe('string');
				expect(typeof scenario.subscriberCount).toBe('number');
				expect(typeof scenario.eventCount).toBe('number');
				expect(typeof scenario.async).toBe('boolean');
			});
		});
	});

	describe('TC-GSS-002 - Custom Scenario Count', () => {
		it('should generate custom number of scenarios', () => {
			const result = GenerateSubscriptionScenarios(3);

			expect(result).toHaveLength(3);
			result.forEach(scenario => {
				expect(scenario).toHaveProperty('name');
				expect(scenario).toHaveProperty('subscriberCount');
				expect(scenario).toHaveProperty('eventCount');
				expect(scenario).toHaveProperty('async');
			});
		});
	});

	describe('TC-GSS-003 - Custom Config with Max Events', () => {
		it('should respect maxEvents from config', () => {
			const customConfig = { ...DEFAULT_MOCK_CONFIG, maxEvents: 10 };
			const result = GenerateSubscriptionScenarios(2, customConfig);

			expect(result).toHaveLength(2);
			result.forEach(scenario => {
				expect(scenario.eventCount).toBeLessThanOrEqual(10);
			});
		});
	});

	describe('TC-GSS-004 - Zero Scenario Count Edge Case', () => {
		it('should handle zero scenario count', () => {
			const result = GenerateSubscriptionScenarios(0);

			expect(result).toEqual([]);
		});
	});

	describe('TC-GSS-005 - Config Without Max Events', () => {
		it('should use default maxEvents when not specified in config', () => {
			const customConfig = { minDelay: 0, maxDelay: 1000, includeTimestamps: true }; // no maxEvents
			const result = GenerateSubscriptionScenarios(2, customConfig);

			expect(result).toHaveLength(2);
			result.forEach(scenario => {
				expect(scenario.eventCount).toBeLessThanOrEqual(20); // default fallback
			});
		});
	});
});
