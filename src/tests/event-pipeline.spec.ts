import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventHandler, DebounceEvents, ThrottleEvents, PipeEvents } from '../index.js';
import type { TEventData } from '../index.js';

interface ITestData {
	id: number;
	value: string;
}

type TTestEvent = TEventData & {
	TestEvent: ITestData;
};

describe('DebounceEvents', () => {
	let handler: EventHandler<ITestData, TTestEvent>;

	beforeEach(() => {
		handler = new EventHandler<ITestData, TTestEvent>('TestEvent');
	});

	afterEach(() => {
		handler.Destroy();
	});

	it('should create a debounced handler without errors', () => {
		const debounced = DebounceEvents(handler, 100);
		expect(debounced).toBeDefined();
		expect(debounced.Name).toBe(handler.Name);
		debounced.Destroy();
	});

	it('should maintain same event handler name', () => {
		const debounced = DebounceEvents(handler, 500);
		expect(debounced.Name).toBe('TestEvent');
		debounced.Destroy();
	});
});

describe('ThrottleEvents', () => {
	let handler: EventHandler<ITestData, TTestEvent>;

	beforeEach(() => {
		handler = new EventHandler<ITestData, TTestEvent>('TestEvent');
	});

	afterEach(() => {
		handler.Destroy();
	});

	it('should create a throttled handler without errors', () => {
		const throttled = ThrottleEvents(handler, 100);
		expect(throttled).toBeDefined();
		expect(throttled.Name).toBe(handler.Name);
		throttled.Destroy();
	});

	it('should maintain same event handler name', () => {
		const throttled = ThrottleEvents(handler, 500);
		expect(throttled.Name).toBe('TestEvent');
		throttled.Destroy();
	});
});

describe('PipeEvents', () => {
	let handler: EventHandler<ITestData, TTestEvent>;

	beforeEach(() => {
		handler = new EventHandler<ITestData, TTestEvent>('TestEvent');
	});

	afterEach(() => {
		handler.Destroy();
	});

	it('should pipe events through transform functions', async () => {
		const results: string[] = [];

		const pipePromise = (async () => {
			for await (const result of PipeEvents(
				handler,
				(event: TTestEvent) => event.TestEvent.value,
				(value: string) => value.toUpperCase(),
				(value: string) => `${value}!`,
			)) {
				results.push(result);
				if (results.length >= 2) break;
			}
		})();

		handler.Trigger({ id: 1, value: 'hello' });
		handler.Trigger({ id: 2, value: 'world' });

		await pipePromise;

		expect(results).toEqual(['HELLO!', 'WORLD!']);
	});

	it('should work with no transform functions', async () => {
		const results: TTestEvent[] = [];

		const pipePromise = (async () => {
			for await (const result of PipeEvents(handler)) {
				results.push(result);
				if (results.length >= 2) break;
			}
		})();

		handler.Trigger({ id: 1, value: 'test1' });
		handler.Trigger({ id: 2, value: 'test2' });

		await pipePromise;

		expect(results.length).toBe(2);
		expect(results[0].TestEvent.value).toBe('test1');
		expect(results[1].TestEvent.value).toBe('test2');
	});

	it('should handle complex transformations', async () => {
		const results: number[] = [];

		const pipePromise = (async () => {
			for await (const result of PipeEvents(
				handler,
				(event: TTestEvent) => event.TestEvent.id,
				(id: number) => id * 2,
				(value: number) => value + 10,
			)) {
				results.push(result);
				if (results.length >= 3) break;
			}
		})();

		handler.Trigger({ id: 1, value: 'test' });
		handler.Trigger({ id: 5, value: 'test' });
		handler.Trigger({ id: 10, value: 'test' });

		await pipePromise;

		expect(results).toEqual([12, 20, 30]); // (1*2)+10, (5*2)+10, (10*2)+10
	});
});
