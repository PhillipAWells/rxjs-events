import { Debounce, Pipe, Throttle } from '@pawells/typescript-common';
import { EventHandler } from './handler.js';
import { TEventData } from './event-data.js';

/**
 * Debounces event emission from an EventHandler.
 * Events are delayed until `ms` milliseconds have passed without any new events.
 * Useful for expensive operations triggered by high-frequency events.
 *
 * @template TObject - The object type for the handler
 * @template TEvent - The event type
 * @param handler - EventHandler to debounce events from
 * @param ms - Debounce delay in milliseconds
 * @returns A new EventHandler that emits debounced events
 *
 * @example
 * ```typescript
 * const handler = new EventHandler<SearchQuery, SearchEvent>('Search');
 * const debounced = DebounceEvents(handler, 300);
 *
 * // Subscribe to the debounced handler
 * debounced.Subscribe((event) => {
 *   console.log('Search executed after 300ms of inactivity');
 * });
 *
 * handler.Trigger({ query: 'a' });
 * handler.Trigger({ query: 'ab' });
 * handler.Trigger({ query: 'abc' }); // Only this final query will be debounced
 * ```
 */
export function DebounceEvents<TObject extends object = object, TEvent extends TEventData = TEventData>(
	handler: EventHandler<TObject, TEvent>,
	ms: number,
): EventHandler<TObject, TEvent> {
	const debouncedHandler = new EventHandler<TObject, TEvent>(handler.Name);
	const debouncedTrigger = Debounce((event: TEvent) => {
		// Extract payload from the event object before triggering to avoid double-wrapping
		const payload = event[handler.Name as keyof TEvent] as TObject;
		debouncedHandler.Trigger(payload);
	}, ms);
	handler.Subscribe((event) => debouncedTrigger(event));
	return debouncedHandler;
}

/**
 * Throttles event emission from an EventHandler.
 * Events are emitted at most once per `ms` milliseconds.
 * Guarantees that the most recent event is eventually emitted.
 *
 * @template TObject - The object type for the handler
 * @template TEvent - The event type
 * @param handler - EventHandler to throttle events from
 * @param ms - Throttle interval in milliseconds
 * @returns A new EventHandler that emits throttled events
 *
 * @example
 * ```typescript
 * const handler = new EventHandler<MouseEvent, PositionEvent>('MouseMove');
 * const throttled = ThrottleEvents(handler, 100);
 *
 * throttled.Subscribe((event) => {
 *   console.log('Position updated (max once per 100ms)');
 * });
 *
 * // High-frequency events will be throttled
 * for (let i = 0; i < 100; i++) {
 *   handler.Trigger({ x: i, y: i });
 * }
 * ```
 */
export function ThrottleEvents<TObject extends object = object, TEvent extends TEventData = TEventData>(
	handler: EventHandler<TObject, TEvent>,
	ms: number,
): EventHandler<TObject, TEvent> {
	const throttledHandler = new EventHandler<TObject, TEvent>(handler.Name);
	const throttledTrigger = Throttle((event: TEvent) => {
		// Extract payload from the event object before triggering to avoid double-wrapping
		const payload = event[handler.Name as keyof TEvent] as TObject;
		throttledHandler.Trigger(payload);
	}, ms);
	handler.Subscribe((event) => throttledTrigger(event));
	return throttledHandler;
}

/**
 * Pipes event payloads through a series of transform functions.
 * Each function receives the output of the previous function and must return a value
 * that can be passed to the next function.
 *
 * @template TEvent - The input event type
 * @template TResult - The final result type after all transforms
 * @param handler - EventHandler to pipe events from
 * @param fns - Transform functions to apply in sequence
 * @returns AsyncIterableIterator of transformed results
 *
 * @example
 * ```typescript
 * interface MessageEvent extends TEventData {
 *   Message: {
 *     text: string;
 *     userId: string;
 *   };
 * }
 *
 * const handler = new EventHandler<any, MessageEvent>('Message');
 *
 * // Transform events through a pipeline: extract → uppercase → log
 * for await (const result of PipeEvents(
 *   handler,
 *   (event: MessageEvent) => event.Message.text,
 *   (text: string) => text.toUpperCase(),
 *   (text: string) => `processed: ${text}`
 * )) {
 *   console.log(result);
 * }
 * ```
 */
export function PipeEvents<TEvent extends TEventData = TEventData, TResult = any>(
	handler: EventHandler<any, TEvent>,
	...fns: Array<(v: any) => any>
): AsyncIterableIterator<TResult> {
	return (async function* (): AsyncIterableIterator<TResult> {
		if (fns.length === 0) {
			for await (const event of handler) {
				yield event as any as TResult;
			}
			return;
		}
		const pipeline = Pipe(...(fns as [any, ...any[]]));
		for await (const event of handler) {
			yield pipeline(event) as TResult;
		}
	})();
}
