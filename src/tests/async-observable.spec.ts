
import { vi } from 'vitest';
import { AsyncObservable, BackpressureStrategy } from '../index.js';
import { Subscription } from 'rxjs';

describe('AsyncObservable', () => {
	describe('Backpressure strategies', () => {
		let subscriptions: Subscription[] = [];

		afterEach(() => {
			subscriptions.forEach(sub => sub.unsubscribe());
			subscriptions = [];
			vi.clearAllTimers();
		});

		it('should limit buffer size with DropOldest strategy', async () => {
			const observable = new AsyncObservable<number>({
				maxBufferSize: 10,
				overflowStrategy: BackpressureStrategy.DropOldest,
			});

			for (let i = 0; i < 20; i++) {
				observable.Push(i);
			}

			const received: number[] = [];
			subscriptions.push(observable.subscribe(value => received.push(value)));

			await new Promise(resolve => setTimeout(resolve, 100));

			expect(received.length).toBe(10);
			expect(received[0]).toBe(10);
			expect(received[9]).toBe(19);
		});

		it('should drop newest events with DropNewest strategy', async () => {
			const observable = new AsyncObservable<number>({
				maxBufferSize: 10,
				overflowStrategy: BackpressureStrategy.DropNewest,
			});

			for (let i = 0; i < 20; i++) {
				observable.Push(i);
			}

			const received: number[] = [];
			subscriptions.push(observable.subscribe(value => received.push(value)));

			await new Promise(resolve => setTimeout(resolve, 100));

			expect(received.length).toBe(10);
			expect(received[0]).toBe(0);
			expect(received[9]).toBe(9);
		});

		it('should throw error with ERROR strategy', () => {
			const observable = new AsyncObservable<number>({
				maxBufferSize: 10,
				overflowStrategy: BackpressureStrategy.Error,
			});

			for (let i = 0; i < 10; i++) {
				observable.Push(i);
			}

			expect(() => observable.Push(10)).toThrow('Buffer overflow');
		});

		it('should use default configuration', () => {
			const observable = new AsyncObservable<number>();

			expect((observable as any)._MaxBufferSize).toBe(1000);
			expect((observable as any)._OverflowStrategy).toBe(BackpressureStrategy.DropOldest);
		});

		it('should handle async iteration with backpressure', async () => {
			const observable = new AsyncObservable<number>({
				maxBufferSize: 5,
				overflowStrategy: BackpressureStrategy.DropOldest,
			});

			for (let i = 0; i < 10; i++) {
				observable.Push(i);
			}

			const iterator = observable[Symbol.asyncIterator]();
			const results: number[] = [];

			for await (const value of iterator) {
				results.push(value);
				if (results.length >= 5) break;
			}

			expect(results.length).toBe(5);
			expect(results[0]).toBe(5);
		});

		it('should handle DropNewest strategy with buffer exactly at limit', () => {
			const observable = new AsyncObservable<number>({
				maxBufferSize: 3,
				overflowStrategy: BackpressureStrategy.DropNewest,
			});

			observable.Push(1);
			observable.Push(2);
			observable.Push(3);
			observable.Push(4);

			expect((observable as any)._Buffer).toEqual([1, 2, 3]);
		});

		it('should handle DropOldest strategy with buffer exactly at limit', () => {
			const observable = new AsyncObservable<number>({
				maxBufferSize: 3,
				overflowStrategy: BackpressureStrategy.DropOldest,
			});

			observable.Push(1);
			observable.Push(2);
			observable.Push(3);
			observable.Push(4);

			expect((observable as any)._Buffer).toEqual([2, 3, 4]);
		});

		it('should handle ERROR strategy buffer overflow', () => {
			const observable = new AsyncObservable<number>({
				maxBufferSize: 2,
				overflowStrategy: BackpressureStrategy.Error,
			});

			observable.Push(1);
			observable.Push(2);

			expect(() => observable.Push(3)).toThrow('Buffer overflow');
		});

		it('should throw error for zero max buffer size', () => {
			expect(() => new AsyncObservable<number>({
				maxBufferSize: 0,
				overflowStrategy: BackpressureStrategy.Error,
			})).toThrow('maxBufferSize must be a positive integer');
		});
	});

	describe('Constructor edge cases', () => {
		it('should handle undefined config', () => {
			const observable = new AsyncObservable<number>(undefined);

			expect((observable as any)._MaxBufferSize).toBe(1000);
			expect((observable as any)._OverflowStrategy).toBe(BackpressureStrategy.DropOldest);
		});

		it('should handle partial config', () => {
			const observable = new AsyncObservable<number>({
				maxBufferSize: 500,
			});

			expect((observable as any)._MaxBufferSize).toBe(500);
			expect((observable as any)._OverflowStrategy).toBe(BackpressureStrategy.DropOldest);
		});

		it('should throw error for negative buffer size', () => {
			expect(() => new AsyncObservable<number>({
				maxBufferSize: -1,
			})).toThrow('maxBufferSize must be a positive integer');
		});
	});

	describe('Destroy', () => {
		it('should complete the async iterator when Destroy() is called', async () => {
			const observable = new AsyncObservable<number>();
			const iterator = observable[Symbol.asyncIterator]();

			const nextPromise = iterator.next();
			observable.Destroy();

			const result = await nextPromise;
			expect(result.done).toBe(true);
		});

		it('should clear the buffer on Destroy()', () => {
			const observable = new AsyncObservable<number>({ maxBufferSize: 5 });
			observable.Push(1);
			observable.Push(2);
			observable.Destroy();

			expect((observable as any)._Buffer).toHaveLength(0);
		});
	});

	describe('Async iterator protocol', () => {
		it('should handle async disposal', async () => {
			const observable = new AsyncObservable<number>();
			const iterator = observable[Symbol.asyncIterator]();

			await iterator[Symbol.asyncDispose]();

			expect(true).toBe(true);
		});

		it('should support Symbol.asyncIterator', () => {
			const observable = new AsyncObservable<number>();
			const iterator = observable[Symbol.asyncIterator]();

			expect(iterator).toBeDefined();
			expect(typeof iterator.next).toBe('function');
			expect(typeof iterator.return).toBe('function');
			expect(typeof iterator.throw).toBe('function');
			expect(typeof iterator[Symbol.asyncDispose]).toBe('function');
		});

		it('should handle return method in iterator', async () => {
			const observable = new AsyncObservable<number>();
			const iterator = observable[Symbol.asyncIterator]();

			const nextPromise = iterator.next();

			const returnResult = await iterator.return();
			expect(returnResult.done).toBe(true);
			expect(returnResult.value).toBe(null); // return() itself yields null per implementation

			const nextResult = await nextPromise;
			expect(nextResult.done).toBe(true);
			expect(nextResult.value).toBeUndefined(); // handleComplete resolves pending next() with undefined
		});

		it('should handle throw method in iterator', async () => {
			const observable = new AsyncObservable<number>();
			const iterator = observable[Symbol.asyncIterator]();
			const throwError = new Error('Iterator throw test');

			const nextPromise = iterator.next();
			const throwPromise = iterator.throw(throwError);

			await expect(throwPromise).rejects.toBe(throwError);
			await expect(nextPromise).rejects.toBe(throwError);
		});

		it('should handle throw method with no pending promises', async () => {
			const observable = new AsyncObservable<number>();
			const iterator = observable[Symbol.asyncIterator]();
			const throwError = new Error('Iterator throw test');

			await expect(iterator.throw(throwError)).rejects.toBe(throwError);
		});

		it('should resolve deferred promises when values arrive during pending next() calls', async () => {
			const observable = new AsyncObservable<number>();
			const iterator = observable[Symbol.asyncIterator]();

			const nextPromises = [
				iterator.next(),
				iterator.next(),
				iterator.next(),
			];

			observable.Push(1);
			observable.Push(2);
			observable.Push(3);

			const results = await Promise.all(nextPromises);
			expect(results[0]).toEqual({ done: false, value: 1 });
			expect(results[1]).toEqual({ done: false, value: 2 });
			expect(results[2]).toEqual({ done: false, value: 3 });
		});

		it('should return done result when next() is called after completion', async () => {
			const observable = new AsyncObservable<number>();
			const iterator = observable[Symbol.asyncIterator]();

			// No public API to complete the observable; access internal Subject directly.
			(observable as any)._Subject.complete();

			const result = await iterator.next();
			expect(result).toEqual({ done: true, value: undefined });
		});

		it('should reject when next() is called after error', async () => {
			const observable = new AsyncObservable<number>();
			const iterator = observable[Symbol.asyncIterator]();
			const testError = new Error('Test error');

			(observable as any)._Subject.error(testError);

			await expect(iterator.next()).rejects.toBe(testError);
		});
	});
});
