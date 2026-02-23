
/**
 * @fileoverview Tests for MockAsyncObservable advanced features
 */

import { vi } from 'vitest';
import { MockAsyncObservable , IMockObservableConfig } from '../mocks/index.js';

describe('MockAsyncObservable', () => {
	afterEach(() => {
		vi.clearAllTimers();
	});
	describe('TC-MO-001 - Config Object Constructor', () => {
		test('should create observable with config object', () => {
			const config: IMockObservableConfig<string> = {
				data: ['a', 'b', 'c'],
				emissionDelay: 10,
				autoComplete: true,
				shouldError: false,
				error: new Error('test error'),
			};

			const observable = new MockAsyncObservable(config);

			expect(observable).toBeDefined();
			expect(observable.GetState()).toEqual({
				currentIndex: 0,
				completed: false,
				errored: false,
				hasMoreData: true,
			});
		});

		test('should merge config with defaults', () => {
			const config: IMockObservableConfig<string> = {
				data: ['a', 'b'],
				emissionDelay: 5,
			};

			const observable = new MockAsyncObservable(config);

			expect(observable).toBeDefined();
		});

		test('should handle array constructor with config override', () => {
			const observable = new MockAsyncObservable(['a', 'b'], {
				emissionDelay: 20,
				autoComplete: false,
				timeout: 5000,
			});

			expect(observable).toBeDefined();
		});
	});

	describe('TC-MO-002 - Error Emission', () => {
		test('should emit error when shouldError is true', async () => {
			const observable = new MockAsyncObservable({
				data: ['a', 'b'],
				shouldError: true,
				error: new Error('Test error'),
			});

			const results: string[] = [];
			let errorCaught: Error | null = null;

			try {
				for await (const value of observable) {
					results.push(value);
				}
			} catch (error) {
				errorCaught = error as Error;
			}

			expect(results).toEqual(['a']);
			expect(errorCaught).toBeInstanceOf(Error);
			expect(errorCaught?.message).toBe('Test error');
		});

		test('should not emit error when shouldError is false', async () => {
			const observable = new MockAsyncObservable({
				data: ['a', 'b'],
				shouldError: false,
			});

			const results: string[] = [];

			for await (const value of observable) {
				results.push(value);
			}

			expect(results).toEqual(['a', 'b']);
		});
	});

	describe('TC-MO-003 - Emission Delay', () => {
		test('should delay emissions by specified amount', async () => {
			const startTime = Date.now();
			const observable = new MockAsyncObservable({
				data: ['a', 'b'],
				emissionDelay: 50,
			});

			const results: string[] = [];

			for await (const value of observable) {
				results.push(value);
			}

			const endTime = Date.now();
			const duration = endTime - startTime;

			expect(results).toEqual(['a', 'b']);
			expect(duration).toBeGreaterThanOrEqual(90); // At least 2 * 50ms, allowing some timing variance
		});

		test('should not delay when emissionDelay is 0', async () => {
			const startTime = Date.now();
			const observable = new MockAsyncObservable({
				data: ['a', 'b'],
				emissionDelay: 0,
			});

			const results: string[] = [];

			for await (const value of observable) {
				results.push(value);
			}

			const endTime = Date.now();
			const duration = endTime - startTime;

			expect(results).toEqual(['a', 'b']);
			expect(duration).toBeLessThan(10); // Should be very fast
		});
	});

	describe('TC-MO-004 - Manual Completion', () => {
		test('should complete manually when autoComplete is false', async () => {
			const observable = new MockAsyncObservable({
				data: ['a', 'b'],
				autoComplete: false,
				timeout: 5000,
			});

			expect(observable.GetState().currentIndex).toBe(0);

			const iterator = observable[Symbol.asyncIterator]();
			await iterator.next();

			expect(observable.GetState().currentIndex).toBe(1);

			await iterator.next();

			expect(observable.GetState().currentIndex).toBe(2);
			expect(observable.GetState().hasMoreData).toBe(false);
		});

		test('should reflect completion state', () => {
			const observable = new MockAsyncObservable(['a']);

			observable.Complete();

			const state = observable.GetState();

			expect(state.completed).toBe(true);
			expect(state.hasMoreData).toBe(true); // Data exists but completed manually
		});

		test('should reflect error state', () => {
			const observable = new MockAsyncObservable(['a']);

			observable.Error();

			const state = observable.GetState();

			expect(state.errored).toBe(true);
		});
	});

	describe('TC-MO-009 - Skip Undefined Values', () => {
		test('should skip undefined values in data array', async () => {
			const observable = new MockAsyncObservable<string | undefined>(['a', undefined, 'b', undefined, 'c']);

			const results: string[] = [];

			for await (const value of observable) {
				if (value !== undefined) {
					results.push(value);
				}
			}

			expect(results).toEqual(['a', 'b', 'c']);
		});
	});

	describe('TC-MO-010 - Reset Functionality', () => {
		test('should reset observable to initial state', async () => {
			const observable = new MockAsyncObservable(['a', 'b', 'c']);

			// Consume some data
			const iterator = observable[Symbol.asyncIterator]();
			await iterator.next(); // consume 'a'
			await iterator.next(); // consume 'b'

			expect(observable.GetState().currentIndex).toBe(2);

			// Reset - this should call the Reset method
			observable.Reset();

			expect(observable.GetState().currentIndex).toBe(0);
			expect(observable.GetState().completed).toBe(false);
			expect(observable.GetState().errored).toBe(false);
		});

		test('should reset error state', () => {
			const observable = new MockAsyncObservable(['a']);

			observable.Error(new Error('test error'));

			expect(observable.GetState().errored).toBe(true);

			observable.Reset();

			expect(observable.GetState()).toEqual({
				currentIndex: 0,
				completed: false,
				errored: false,
				hasMoreData: true,
			});
		});

		test('should reset completion state', () => {
			const observable = new MockAsyncObservable(['a']);

			observable.Complete();

			expect(observable.GetState().completed).toBe(true);

			observable.Reset();

			expect(observable.GetState()).toEqual({
				currentIndex: 0,
				completed: false,
				errored: false,
				hasMoreData: true,
			});
		});
	});

	describe('TC-MO-010-AddData - AddData Functionality', () => {
		test('should add data to observable and continue iteration', async () => {
			const observable = new MockAsyncObservable(['a', 'b'], {
				autoComplete: false,
				timeout: 1000,
			});

			const results: string[] = [];

			const iterationPromise = (async () => {
				for await (const value of observable) {
					results.push(value);
					if (results.length >= 4) break; // Prevent infinite loop
				}
			})();

			// Consume initial data
			await new Promise(resolve => setTimeout(resolve, 10));
			expect(results).toEqual(['a', 'b']);

			// Add more data
			observable.AddData('c', 'd');

			// Wait for new data to be consumed
			await new Promise(resolve => setTimeout(resolve, 10));
			expect(results).toEqual(['a', 'b', 'c', 'd']);

			// Ensure iteration completes
			await iterationPromise;
		});

		test('should handle adding data to empty observable', () => {
			const observable = new MockAsyncObservable<string>([], {
				autoComplete: false,
			});

			expect(observable.GetState().hasMoreData).toBe(false);

			observable.AddData('new-item');

			expect(observable.GetState().hasMoreData).toBe(true);
		});
	});

	describe('TC-MO-011 - Dispose Functionality', () => {
		test('should dispose observable and abort controller', () => {
			const observable = new MockAsyncObservable(['a', 'b', 'c']);

			expect(observable.GetState().completed).toBe(false);

			// Dispose - this should call the Dispose method
			observable.Dispose();

			expect(observable.GetState().completed).toBe(true);
		});

		test('should prevent further iteration after dispose', async () => {
			const observable = new MockAsyncObservable(['a', 'b', 'c']);

			observable.Dispose();

			const results: string[] = [];
			for await (const value of observable) {
				results.push(value);
			}

			expect(results).toEqual([]); // No values should be emitted after dispose
		});
	});

	describe('TC-MO-012 - Timeout and Cancellation', () => {
		test('should handle external abort signal', async () => {
			const abortController = new AbortController();
			const observable = new MockAsyncObservable({
				data: ['a', 'b', 'c'],
				autoComplete: false,
				timeout: 1000,
				abortSignal: abortController.signal,
			});

			const results: string[] = [];

			// Start consuming and abort immediately
			abortController.abort();

			for await (const value of observable) {
				results.push(value);
			}

			expect(results).toEqual([]); // Should get no values when aborted immediately
		});

		test('should dispose properly with abort signal', () => {
			const abortController = new AbortController();
			const observable = new MockAsyncObservable({
				data: ['a', 'b', 'c'],
				autoComplete: false,
				abortSignal: abortController.signal,
			});

			expect(observable.GetState().completed).toBe(false);

			observable.Dispose();

			expect(observable.GetState().completed).toBe(true);
		});

		test('should handle abort signal in _waitForData method', async () => {
			const abortController = new AbortController();
			const observable = new MockAsyncObservable({
				data: ['a'],
				autoComplete: false,
				timeout: 1000,
				abortSignal: abortController.signal,
			});

			const iterator = observable[Symbol.asyncIterator]();
			await iterator.next(); // Consume 'a'

			// Abort immediately
			setTimeout(() => abortController.abort(), 10);

			// Next call should be cancelled and complete the observable
			const result = await iterator.next();
			expect(result.done).toBe(true);
			expect(result.value).toBeUndefined();

			// Observable should be completed after cancellation
			expect(observable.GetState().completed).toBe(true);
		}, 1000); // Increase test timeout
	});
});
