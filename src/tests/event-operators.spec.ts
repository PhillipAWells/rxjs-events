import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventHandler, ChunkEvents, PartitionEvents, GroupEventsByPayload } from '../index.js';
import type { TEventData } from '../index.js';

interface ITestData {
	id: number;
	value: string;
}

type TTestEvent = TEventData & {
	TestEvent: ITestData;
};

describe('ChunkEvents', () => {
	let handler: EventHandler<ITestData, TTestEvent>;

	beforeEach(() => {
		handler = new EventHandler<ITestData, TTestEvent>('TestEvent');
	});

	afterEach(() => {
		handler.Destroy();
	});

	it('should batch events into chunks of specified size', async () => {
		const chunks: TTestEvent[][] = [];

		const batchPromise = (async () => {
			for await (const chunk of ChunkEvents(handler, 3)) {
				chunks.push(chunk);
			}
		})();

		// Trigger events
		for (let i = 0; i < 7; i++) {
			handler.Trigger({ id: i, value: `event-${i}` });
		}

		// Give async iteration time to process
		await new Promise((resolve) => setTimeout(resolve, 50));
		handler.Destroy();

		await batchPromise.catch(() => {
			// Expected to fail when handler is destroyed
		});

		expect(chunks.length).toBeGreaterThan(0);
		if (chunks.length > 0) {
			expect(chunks[0].length).toBeLessThanOrEqual(3);
		}
	});

	it('should throw when batch size is <= 0', () => {
		expect(() => {
			ChunkEvents(handler, 0);
		}).toThrow(RangeError);

		expect(() => {
			ChunkEvents(handler, -1);
		}).toThrow(RangeError);
	});
});

describe('PartitionEvents', () => {
	let handler: EventHandler<ITestData, TTestEvent>;

	beforeEach(() => {
		handler = new EventHandler<ITestData, TTestEvent>('TestEvent');
	});

	afterEach(() => {
		handler.Destroy();
	});

	it('should partition events into two iterators', async () => {
		const matching: TTestEvent[] = [];
		const nonMatching: TTestEvent[] = [];

		const [matchIterator, noMatchIterator] = PartitionEvents(handler, (event) => {
			const data = event.TestEvent;
			return data.id % 2 === 0; // even IDs match
		});

		const matchPromise = (async () => {
			for await (const event of matchIterator) {
				matching.push(event);
				if (matching.length >= 2) break;
			}
		})();

		const noMatchPromise = (async () => {
			for await (const event of noMatchIterator) {
				nonMatching.push(event);
				if (nonMatching.length >= 2) break;
			}
		})();

		// Trigger events
		for (let i = 0; i < 4; i++) {
			handler.Trigger({ id: i, value: `event-${i}` });
		}

		await Promise.allSettled([matchPromise, noMatchPromise]);

		expect(matching.length).toBeGreaterThan(0);
		expect(nonMatching.length).toBeGreaterThan(0);

		// Even IDs should be in matching
		if (matching.length > 0) {
			const id = matching[0].TestEvent.id;
			expect(id % 2).toBe(0);
		}

		// Odd IDs should be in nonMatching
		if (nonMatching.length > 0) {
			const id = nonMatching[0].TestEvent.id;
			expect(id % 2).toBe(1);
		}
	});
});

describe('GroupEventsByPayload', () => {
	let handler: EventHandler<ITestData, TTestEvent>;

	beforeEach(() => {
		handler = new EventHandler<ITestData, TTestEvent>('TestEvent');
	});

	afterEach(() => {
		handler.Destroy();
	});

	it('should group events by key function', async () => {
		const groups: Map<string, TTestEvent[]>[] = [];

		const groupPromise = (async () => {
			for await (const groupMap of GroupEventsByPayload(
				handler,
				(event) => event.TestEvent.value.split('-')[1],
				2,
			)) {
				groups.push(groupMap);
			}
		})();

		// Trigger events
		for (let i = 0; i < 5; i++) {
			handler.Trigger({ id: i, value: `group-${i % 2}` });
		}

		await new Promise((resolve) => setTimeout(resolve, 50));
		handler.Destroy();

		await groupPromise.catch(() => {
			// Expected when handler is destroyed
		});

		expect(groups.length).toBeGreaterThan(0);
	});

	it('should throw when flush size is <= 0', () => {
		expect(() => {
			GroupEventsByPayload(handler, () => 'key', 0);
		}).toThrow(RangeError);

		expect(() => {
			GroupEventsByPayload(handler, () => 'key', -1);
		}).toThrow(RangeError);
	});
});
