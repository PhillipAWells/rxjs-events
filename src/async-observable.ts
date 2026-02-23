
import { Observable, Subject, Subscription } from 'rxjs';
import { IAsyncGeneratorESN } from './async-generator-esn.js';

/**
 * Error thrown when the observable buffer overflows.
 */
export class BufferOverflowError extends Error {
	constructor(maxSize: number) {
		super(`Buffer overflow: maximum buffer size of ${maxSize} exceeded`);
		this.name = 'BufferOverflowError';
	}
}

/**
 * Backpressure overflow strategy
 */
export enum BackpressureStrategy {
	/** Drop oldest events when buffer is full */
	DropOldest = 'DropOldest',
	/** Drop newest events when buffer is full */
	DropNewest = 'DropNewest',
	/** Throw error when buffer is full */
	Error = 'Error',
}

/**
 * Configuration for AsyncObservable backpressure
 */
export interface IBackpressureConfig {
	/** Maximum buffer size (default: 1000) */
	maxBufferSize?: number;
	/** Strategy when buffer overflows (default: DropOldest) */
	overflowStrategy?: BackpressureStrategy;
}

/** Default maximum buffer size for AsyncObservable instances */
const DEFAULT_MAX_BUFFER_SIZE = 1000;

/**
 * An Observable that can be used as an async iterator with backpressure support.
 * @template T The type of the values emitted by the observable.
 */
export class AsyncObservable<T> extends Observable<T> {
	private readonly _Subject = new Subject<T>();

	private readonly _Buffer: T[] = [];

	private readonly _MaxBufferSize: number;

	private readonly _OverflowStrategy: BackpressureStrategy;

	/**
	 * @remarks
	 * **Buffer replay on subscription:** every new subscriber receives all buffered items
	 * (those added via `Push()` before the subscriber connected), followed by live items.
	 * This is intentional "replay" behaviour — late subscribers see historical data.
	 * If you only want live items, subscribe before pushing any data.
	 */
	constructor(config?: IBackpressureConfig) {
		super(observer => {
			// Connect the observer to the live subject first so it will receive future pushes,
			// then replay already-buffered items in order. Because JavaScript is single-threaded,
			// no new Push() can interleave between these two steps, so replay order is guaranteed.
			const innerSub = this._Subject.subscribe(observer);
			for (const item of this._Buffer) {
				observer.next(item);
			}
			return () => innerSub.unsubscribe();
		});

		this._MaxBufferSize = config?.maxBufferSize ?? DEFAULT_MAX_BUFFER_SIZE;
		this._OverflowStrategy = config?.overflowStrategy ?? BackpressureStrategy.DropOldest;

		// Validate buffer size
		if (this._MaxBufferSize <= 0) {
			throw new RangeError('maxBufferSize must be a positive integer');
		}
	}

	/**
	 * Adds an event to the buffer with backpressure handling
	 */
	public Push(value: T): void {
		if (this._Buffer.length >= this._MaxBufferSize) {
			this._HandleOverflow(value);
		} else {
			this._Buffer.push(value);
			this._Subject.next(value);
		}
	}

	private _HandleOverflow(value: T): void {
		switch (this._OverflowStrategy) {
			case BackpressureStrategy.DropOldest:
				this._Buffer.shift();
				this._Buffer.push(value);
				this._Subject.next(value);
				break;
			case BackpressureStrategy.DropNewest:
				// Simply don't add the new value
				break;
			case BackpressureStrategy.Error:
				throw new BufferOverflowError(this._MaxBufferSize);
		}
	}

	/**
	 * Destroys the observable and completes the internal subject, cleaning up all resources.
	 *
	 * @example
	 * ```typescript
	 * const observable = new AsyncObservable<number>();
	 * observable.Push(1);
	 * observable.Destroy(); // Completes the subject; subscribers stop receiving events
	 * ```
	 */
	public Destroy(): void {
		this._Subject.complete();
		this._Buffer.length = 0;
	}

	/**
	 * Returns an async generator that can be used to iterate over the values emitted by the observable.
	 *
	 * Each call creates an independent iterator with its own local queue, so multiple concurrent
	 * iterators on the same AsyncObservable are safe — they do not interfere with each other or
	 * with the shared replay buffer.
	 *
	 * @returns An async generator.
	 */
	public [Symbol.asyncIterator](): AsyncGenerator<T, void, void> {
		let subscription: Subscription | undefined;
		let hasError = false;
		let error: unknown;
		let completed = false;
		// Per-iterator queue — never mutates the shared _Buffer.
		const localQueue: T[] = [];
		const deferreds: [(_value: IteratorResult<T>) => void, (_reason: unknown) => void][] = [];

		const handleError = (err: unknown): void => {
			hasError = true;
			error = err;

			while (deferreds.length) {
				const deferred = deferreds.shift();
				if (deferred) {
					const [, reject] = deferred;
					reject(err);
				}
			}
		};

		const handleComplete = (): void => {
			completed = true;

			while (deferreds.length) {
				const deferred = deferreds.shift();
				if (deferred) {
					const [resolve] = deferred;
					resolve({ done: true, value: undefined });
				}
			}
		};

		const generator: IAsyncGeneratorESN<T, void, void> = {
			[Symbol.asyncDispose]: () => {
				return new Promise<void>((resolve) => {
					subscription?.unsubscribe();
					resolve();
				});
			},

			next: (): Promise<IteratorResult<T>> => {
				// Lazily create the subscription on first next() call.
				// Because JS is single-threaded, the Observable's subscriber function runs
				// synchronously: it first connects to _Subject (for live items), then replays
				// all buffered items through the `next` handler below.  At that point `deferreds`
				// is always empty, so every replayed item lands in `localQueue`.  This means the
				// shared _Buffer is never mutated here and multiple concurrent iterators are safe.
				subscription ??= this.subscribe({
					complete: handleComplete,
					error: handleError,

					next: (value) => {
						if (deferreds.length) {
							// A consumer is already waiting; deliver directly.
							const deferred = deferreds.shift();
							if (deferred) {
								const [resolve] = deferred;
								resolve({ done: false, value });
							}
						} else {
							localQueue.push(value);
						}
					},
				});

				if (localQueue.length) {
					const value = localQueue.shift() as T;
					return Promise.resolve({ done: false, value });
				}

				if (completed) {
					return Promise.resolve({ done: true, value: undefined });
				}

				if (hasError) {
					return Promise.reject(error);
				}

				return new Promise((resolve, reject) => {
					deferreds.push([resolve, reject]);
				});
			},

			return: (): Promise<IteratorResult<T>> => {
				subscription?.unsubscribe();
				// Resolve all pending next() promises so callers are not left hanging.
				handleComplete();
				return Promise.resolve({ done: true, value: null });
			},

			throw: (err): Promise<IteratorResult<T>> => {
				subscription?.unsubscribe();
				// Reject all pending next() promises so callers are not left hanging.
				handleError(err);
				return Promise.reject(err);
			},
			[Symbol.asyncIterator]() {
				return this;
			},
		};
		return generator;
	}
}
