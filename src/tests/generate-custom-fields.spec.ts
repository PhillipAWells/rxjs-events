
import { GenerateCustomFields } from '../mocks/index.js';

describe('GenerateCustomFields', () => {
	describe('TC-GCF-001 - Generator Function Throws Error', () => {
		it('should handle generator functions that throw errors', () => {
			const result = GenerateCustomFields({
				SuccessField: () => 'success',
				ErrorField: () => {
					throw new Error('Test error');
				},
			});

			expect(result).toEqual({
				['SuccessField']: 'success',
				['ErrorField']: null,
			});
		});
	});

	describe('TC-GCF-002 - Mixed Success and Error Generators', () => {
		it('should handle mixed success and error generators', () => {
			const result = GenerateCustomFields({
				Field1: () => 'value1',
				Field2: () => {
					throw new Error('Error 2');
				},
				Field3: () => 42,
				Field4: () => {
					throw new Error('Error 4');
				},
			});

			expect(result).toEqual({
				['Field1']: 'value1',
				['Field2']: null,
				['Field3']: 42,
				['Field4']: null,
			});
		});
	});
});
