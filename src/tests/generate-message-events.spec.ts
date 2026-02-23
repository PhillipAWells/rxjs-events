
import { GenerateMessageEvents } from '../mocks/index.js';

describe('GenerateMessageEvents', () => {
	describe('TC-GME-001 - Default Count Generation', () => {
		it('should generate default count of message events', () => {
			const result = GenerateMessageEvents();

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(
				expect.objectContaining({
					messageReceived: expect.objectContaining({
						['Text']: expect.any(String),
						['Priority']: expect.any(String),
						['Channel']: expect.any(String),
					}),
				}),
			);
		});
	});

	describe('TC-GME-002 - Custom Count Generation', () => {
		it('should generate custom count of message events', () => {
			const result = GenerateMessageEvents(3);

			expect(result).toHaveLength(3);
			result.forEach(event => {
				expect(event).toEqual(
					expect.objectContaining({
						messageReceived: expect.objectContaining({
							['Text']: expect.any(String),
							['Priority']: expect.any(String),
							['Channel']: expect.any(String),
						}),
					}),
				);
			});
		});
	});

	describe('TC-GME-003 - Zero Count Edge Case', () => {
		it('should handle zero count (note: current implementation defaults to 1)', () => {
			const result = GenerateMessageEvents(0);

			expect(result).toHaveLength(1); // Due to || 1 in generateEventData
		});
	});

	describe('TC-GME-004 - Large Count Performance', () => {
		it('should handle large count generation', () => {
			const result = GenerateMessageEvents(100);

			expect(result).toHaveLength(100);
			result.forEach(event => {
				expect(event).toHaveProperty('messageReceived');
			});
		});
	});
});
