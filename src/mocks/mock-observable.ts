/**
 * @fileoverview Mock implementation of AsyncObservable for testing scenarios
 */

import type { IMockObservableConfig } from './types.js';

/**
 * Mock implementation of AsyncObservable with controllable data streams
 *
 * @template T - The type of values emitted by this observable
 */
export class MockAsyncObservable<T> {
	private readonly _config: Required<IMockObservableConfig<T>>;

	private _currentIndex = 0;

	private _completed = false;

	private _errored = false;

	private readonly _abortController: AbortController;

	private readonly _externalAbortSignal: AbortSignal | undefined;

	/**
	 * Creates a new MockAsyncObservable instance
	 *
	 * @param dataOrConfig - Array of data to emit or full configuration object
	 * @param config - Additional configuration if first parameter is data array
	 */
	constructor(
		dataOrConfig: T[] | IMockObservableConfig<T>,
		config: Partial<IMockObservableConfig<T>> = {},
	) {
		let abortSignal: AbortSignal | undefined;
		let timeout: number;

		if (Array.isArray(dataOrConfig)) {
			abortSignal = config.abortSignal;
			timeout = config.timeout ?? 0;
			this._config = {
				data: dataOrConfig,
				emissionDelay: 0,
				autoComplete: true,
				shouldError: false,
				error: new Error('Mock observable error'),
				timeout,
				...config,
			} as Required<IMockObservableConfig<T>>;
		} else {
			abortSignal = (dataOrConfig as IMockObservableConfig<T>).abortSignal;
			timeout = (dataOrConfig as IMockObservableConfig<T>).timeout ?? 0;
			this._config = {
				emissionDelay: 0,
				autoComplete: true,
				shouldError: false,
				error: new Error('Mock observable error'),
				timeout,
				...dataOrConfig,
			} as Required<IMockObservableConfig<T>>;
		}

		this._externalAbortSignal = abortSignal;
		this._abortController = new AbortController();
		if (this._externalAbortSignal) {
			this._externalAbortSignal.addEventListener('abort', () => {
				this._abortController.abort();
			}, { once: true });
		}
	}

	/**
	 * Async iterator implementation for for-await-of loops
	 */
	public async * [Symbol.asyncIterator](): AsyncGenerator<T, void, void> {
		while (!this._completed) {
			// Check for error state (manual or config-based)
			if (this._errored || (this._config.shouldError && this._currentIndex > 0)) {
				this._errored = true;
				throw this._config.error;
			}

			if (this._currentIndex < this._config.data.length) {
				// Check for cancellation
				if (this._abortController.signal.aborted) {
					this._completed = true;
					break;
				}

				const value = this._config.data[this._currentIndex];
				this._currentIndex++;

				if (value !== undefined) {
					if (this._config.emissionDelay > 0) {
						await this._delay(this._config.emissionDelay);
					}

					// Final state validation before yielding
					if (!this._completed && !this._errored && !this._abortController.signal.aborted) {
						yield value;
					}
				}
			} else if (this._config.autoComplete) {
				this._completed = true;
				break;
			} else {
				// Wait for more data or manual completion with timeout and cancellation
				try {
					await this._waitForData();
				} catch {
					// If timeout or cancelled, complete the observable
					this._completed = true;
					break;
				}
			}
		}
	}

	/**
	 * Add more data to the observable
	 *
	 * @param items - Data items to add
	 */
	public AddData(...items: T[]): void {
		this._config.data.push(...items);
	}

	/**
	 * Manually complete the observable
	 */
	public Complete(): void {
		this._completed = true;
	}

	/**
	 * Manually trigger an error
	 *
	 * @param error - Error to emit
	 */
	public Error(error?: Error): void {
		this._config.error = error ?? this._config.error;
		this._errored = true;
	}

	/**
	 * Reset the observable to initial state
	 */
	public Reset(): void {
		this._currentIndex = 0;
		this._completed = false;
		this._errored = false;
	}

	/**
	 * Dispose of the observable and clean up resources
	 */
	public Dispose(): void {
		this._abortController.abort();
		this._completed = true;
	}

	/**
	 * Get current state information
	 */
	public GetState(): {
		currentIndex: number;
		completed: boolean;
		errored: boolean;
		hasMoreData: boolean;
	} {
		return {
			currentIndex: this._currentIndex,
			completed: this._completed,
			errored: this._errored,
			hasMoreData: this._currentIndex < this._config.data.length,
		};
	}

	/**
	 * Utility method for creating delays
	 */
	// eslint-disable-next-line require-await
	private async _delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Cancellable delay with timeout for waiting for new data
	 */
	private async _waitForData(): Promise<void> {
		if (this._abortController.signal.aborted) {
			throw new Error('Operation cancelled');
		}

		const { timeout } = this._config;
		const WAIT_POLL_MS = 10;
		const sleepPromise = this._delay(WAIT_POLL_MS);

		const promises: Promise<any>[] = [sleepPromise];

		if (timeout > 0) {
			promises.push(new Promise<never>((_, reject) => {
				setTimeout(() => reject(new Error('Timeout waiting for data')), timeout);
			}));
		}

		// Register a single abort listener and remove it after the race settles
		let abortReject: ((err: Error) => void) | undefined;
		const abortPromise = new Promise<never>((_, reject) => {
			abortReject = reject;
		});
		const abortHandler = (): void => abortReject?.(new Error('Operation cancelled'));
		this._abortController.signal.addEventListener('abort', abortHandler, { once: true });
		promises.push(abortPromise);

		try {
			await Promise.race(promises);
		} finally {
			this._abortController.signal.removeEventListener('abort', abortHandler);
		}
	}
}
