
import { vi } from 'vitest';
import { GenerateUserEvents } from '../mocks/index.js';

describe('GenerateUserEvents', () => {
	describe('TC-GUE-001 - Default Count Generation', () => {
		it('should generate default count of user events', () => {
			const result = GenerateUserEvents();

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(
				expect.objectContaining({
					userCreated: expect.objectContaining({
						id: expect.any(String),
						timestamp: expect.any(String),
						sequence: expect.any(Number),
						['Username']: expect.any(String),
						['Email']: expect.any(String),
						['Role']: expect.any(String),
						['Active']: expect.any(Boolean),
					}),
				}),
			);
		});
	});

	describe('TC-GUE-002 - Custom Count Generation', () => {
		it('should generate custom count of user events', () => {
			const result = GenerateUserEvents(3);

			expect(result).toHaveLength(3);
			result.forEach(event => {
				expect(event).toEqual(
					expect.objectContaining({
						userCreated: expect.objectContaining({
							['Username']: expect.any(String),
							['Email']: expect.any(String),
							['Role']: expect.any(String),
							['Active']: expect.any(Boolean),
						}),
					}),
				);
			});
		});
	});

	describe('TC-GUE-003 - Edge Case: Math.random Returns 1 (Out of Bounds)', () => {
		it('should handle Math.random returning 1 (array access out of bounds)', () => {
			const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(1);

			const result = GenerateUserEvents(1);

			expect(result).toHaveLength(1);
			const event = result[0]!;
			expect(event.userCreated.Username).toBe('user'); // fallback value
			expect(event.userCreated.Email).toBe('user@example.com'); // fallback values

			mathRandomSpy.mockRestore();
		});
	});

	describe('TC-GUE-004 - Active Field True Branch', () => {
		it('should set Active to true when Math.random > 0.2', () => {
			const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.3);

			const result = GenerateUserEvents(1);

			const event = result[0]!;
			expect(event.userCreated.Active).toBe(true);

			mathRandomSpy.mockRestore();
		});
	});

	describe('TC-GUE-005 - Active Field False Branch', () => {
		it('should set Active to false when Math.random <= 0.2', () => {
			const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.1);

			const result = GenerateUserEvents(1);

			const event = result[0]!;
			expect(event.userCreated.Active).toBe(false);

			mathRandomSpy.mockRestore();
		});
	});

	describe('TC-GUE-006 - Zero Count Edge Case', () => {
		it('should handle zero count (defaults to 1)', () => {
			const result = GenerateUserEvents(0);

			expect(result).toHaveLength(1);
		});
	});
});
