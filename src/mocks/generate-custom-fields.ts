/**
 * Generates custom fields based on field generators
 *
 * @example
 * ```typescript
 * const fields = generateCustomFields({
 *   name: () => 'Alice',
 *   age: () => 25
 * });
 * // Returns { name: 'Alice', age: 25 }
 * ```
 *
 * @param customFields - Object with field names and generator functions
 * @returns Object with generated field values
 */
export function GenerateCustomFields(customFields: Record<string, () => unknown>): Record<string, unknown> {
	const fields: Record<string, unknown> = {};

	for (const [key, generator] of Object.entries(customFields)) {
		try {
			fields[key] = generator();
		} catch (error) {
			console.warn(`Failed to generate field '${key}':`, error);
			fields[key] = null;
		}
	}

	return fields;
}
