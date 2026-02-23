import type { IMockConfig } from './types.js';
import { DEFAULT_MOCK_CONFIG } from './constants.js';

const DEFAULT_SCENARIO_COUNT = 5;
const MAX_RANDOM_SUBSCRIBERS = 10;
const DEFAULT_MAX_EVENTS = 20;
const ASYNC_THRESHOLD = 0.5;

// Mulberry32 PRNG constants — part of the algorithm specification, not arbitrary values.
const MULBERRY32_INCREMENT = 0x6D2B79F5;
const MULBERRY32_SHIFT_A = 15;
const MULBERRY32_SHIFT_B = 7;
const MULBERRY32_MIX_C = 61;
const MULBERRY32_SHIFT_C = 14;
const MULBERRY32_DIVISOR = 0x100000000;

/**
 * A simple seeded pseudo-random number generator (mulberry32).
 * Returns values in [0, 1) — same interface as Math.random().
 */
function makeSeededRandom(seed: number): () => number {
	let s = seed;
	return () => {
		s += MULBERRY32_INCREMENT;
		let z = s;
		z = Math.imul(z ^ (z >>> MULBERRY32_SHIFT_A), z | 1);
		z ^= z + Math.imul(z ^ (z >>> MULBERRY32_SHIFT_B), z | MULBERRY32_MIX_C);
		return ((z ^ (z >>> MULBERRY32_SHIFT_C)) >>> 0) / MULBERRY32_DIVISOR;
	};
}

/**
 * Generates subscription test scenarios.
 *
 * Pass a numeric `seed` in `config` to produce deterministic output — useful for
 * reproducible tests. When no seed is given the function uses `Math.random()`.
 *
 * @example
 * ```typescript
 * // Non-deterministic (default)
 * const scenarios = GenerateSubscriptionScenarios(3, { maxEvents: 50 });
 *
 * // Deterministic — same output every run
 * const scenarios = GenerateSubscriptionScenarios(3, { maxEvents: 50, seed: 42 });
 * ```
 *
 * @param scenarioCount - Number of different scenarios to generate
 * @param config - Mock configuration options (supports optional `seed` for determinism)
 * @returns Array of subscription scenario configurations
 */
export function GenerateSubscriptionScenarios(
	scenarioCount = DEFAULT_SCENARIO_COUNT,
	config: IMockConfig & { seed?: number } = DEFAULT_MOCK_CONFIG,
): Array<{
	name: string;
	subscriberCount: number;
	eventCount: number;
	async: boolean;
}> {
	const rand = config.seed !== undefined ? makeSeededRandom(config.seed) : Math.random.bind(Math);
	const scenarios = [];

	for (let i = 0; i < scenarioCount; i++) {
		scenarios.push({
			name: `Scenario ${i + 1}`,
			subscriberCount: Math.max(1, Math.floor(rand() * MAX_RANDOM_SUBSCRIBERS)),
			eventCount: Math.max(1, Math.min(config.maxEvents ?? DEFAULT_MAX_EVENTS, Math.floor(rand() * DEFAULT_MAX_EVENTS))),
			async: rand() > ASYNC_THRESHOLD,
		});
	}

	return scenarios;
}
