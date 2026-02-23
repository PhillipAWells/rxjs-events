/**
 * Extended AsyncGenerator interface with async disposal support.
 *
 * ESN = Explicit Symbol Notation — extends AsyncGenerator with `Symbol.asyncDispose` support
 * for the TC39 Explicit Resource Management proposal (`using` keyword). `Symbol.asyncDispose`
 * is called when the generator is used in a `await using` block.
 *
 * @template T The type of the values yielded by the generator.
 * @template TReturn The type of the value returned by the generator.
 * @template TNext The type of the value that can be passed to the generator's next() method.
 *
 * @example
 * ```typescript
 * async function* myGenerator(): IAsyncGeneratorESN<string, void, void> {
 *   yield 'value1';
 *   yield 'value2';
 * }
 *
 * // With await using (requires TypeScript 5.2+)
 * await using gen = myGenerator() as unknown as AsyncDisposable;
 * // gen is automatically disposed when it goes out of scope
 * ```
 */
export interface IAsyncGeneratorESN<T = unknown, TReturn = unknown, TNext = unknown> extends AsyncGenerator<T, TReturn, TNext> {
	[Symbol.asyncDispose](): PromiseLike<void>
}
