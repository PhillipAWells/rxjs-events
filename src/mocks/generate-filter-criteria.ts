import { MOCK_ROLES, MOCK_PRIORITIES, MOCK_STATUS_VALUES } from './constants.js';

/**
 * Generates filter criteria for testing event filtering
 *
 * @example
 * ```typescript
 * const criteria = generateFilterCriteria('simple');
 * // Returns array of simple filter criteria using mock constants
 * ```
 *
 * @param complexity - 'simple' | 'moderate' | 'complex'
 * @returns Array of filter criteria objects
 */
export function GenerateFilterCriteria(complexity: 'simple' | 'moderate' | 'complex' = 'simple'): Array<Record<string, unknown>> {
	const simple = [
		{ role: MOCK_ROLES[1] }, // admin
		{ active: true },
		{ priority: MOCK_PRIORITIES[2] }, // high
		{ status: MOCK_STATUS_VALUES[0] }, // active
	];

	const moderate = [
		{ role: MOCK_ROLES[1], active: true }, // admin
		{ priority: MOCK_PRIORITIES[2], channel: '#support' }, // high
		{ status: MOCK_STATUS_VALUES[0], type: 'user' }, // active
		{ level: 1, verified: true },
	];

	// 'complex' criteria use only primitive values so they are compatible with the strict
	// equality comparison performed by EventFilter. Object/array values were removed because
	// EventFilter uses === and object literals never satisfy that check.
	const complex = [
		{ role: MOCK_ROLES[1], active: true, level: 5 }, // admin, level 5
		{ priority: MOCK_PRIORITIES[2], urgent: true }, // high, urgent
		{ type: 'user', status: MOCK_STATUS_VALUES[0] }, // active user
		{ category: 'system', severity: 'error', retryCount: 0 },
	];

	switch (complexity) {
		case 'simple': return simple;
		case 'moderate': return moderate;
		case 'complex': return complex;
		default: return simple;
	}
}
