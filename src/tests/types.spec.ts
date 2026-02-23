 
import type {
	IMockEventHandlerConfig,
	IMockSubscription,
	IEventDataGeneratorConfig,
	IMockObservableConfig,
	ICustomMatchers,
	IMockConfig,
	IMockEventData,
} from '../mocks/types.js';

describe('mock type definitions', () => {
	describe('IMockEventHandlerConfig', () => {
		it('should configure mock event handlers', () => {
			const config: IMockEventHandlerConfig = {
				asyncMode: true,
				delay: 100,
				maxSubscribers: 10,
				trackCalls: true,
			};
			expect(config.asyncMode).toBe(true);
			expect(config.delay).toBe(100);
			expect(config.maxSubscribers).toBe(10);
			expect(config.trackCalls).toBe(true);
		});
	});

	describe('IMockSubscription', () => {
		it('should represent mock subscriptions', () => {
			const mockHandler = (): void => {};
			const subscription: IMockSubscription = {
				id: 1,
				handler: mockHandler,
				createdAt: new Date(),
				active: true,
			};
			expect(subscription.id).toBe(1);
			expect(typeof subscription.handler).toBe('function');
			expect(subscription.active).toBe(true);
		});
	});

	describe('IEventDataGeneratorConfig', () => {
		it('should configure event data generation', () => {
			const config: IEventDataGeneratorConfig = {
				count: 5,
				seed: 'test-seed',
				customFields: {
					UserId: () => Math.random(),
				},
			};
			expect(config.count).toBe(5);
			expect(config.seed).toBe('test-seed');
			expect(typeof config.customFields?.['UserId']).toBe('function');
		});
	});

	describe('IMockObservableConfig', () => {
		it('should configure mock observables', () => {
			const config: IMockObservableConfig<string> = {
				data: ['event1', 'event2', 'event3'],
				emissionDelay: 50,
				autoComplete: true,
				shouldError: false,
			};
			expect(config.data).toEqual(['event1', 'event2', 'event3']);
			expect(config.emissionDelay).toBe(50);
			expect(config.autoComplete).toBe(true);
			expect(config.shouldError).toBe(false);
		});
	});

	describe('ICustomMatchers', () => {
		it('should define custom Vitest matchers', () => {
			const matchers: ICustomMatchers = {
				toHaveSubscribers: (): any => ({}),
				toHaveTriggeredEvent: (): any => ({}),
				toMatchEventFilter: (): any => ({}),
			};
			expect(typeof matchers.toHaveSubscribers).toBe('function');
			expect(typeof matchers.toHaveTriggeredEvent).toBe('function');
			expect(typeof matchers.toMatchEventFilter).toBe('function');
		});
	});

	describe('IMockConfig', () => {
		it('should configure mock event generation', () => {
			const config: IMockConfig = {
				maxEvents: 100,
				minDelay: 10,
				maxDelay: 1000,
				includeTimestamps: true,
			};
			expect(config.maxEvents).toBe(100);
			expect(config.minDelay).toBe(10);
			expect(config.maxDelay).toBe(1000);
			expect(config.includeTimestamps).toBe(true);
		});
	});

	describe('IMockEventData', () => {
		it('should represent mock event data', () => {
			const eventData: IMockEventData = {
				type: 'user_action',
				payload: { action: 'click', target: 'button' },
				timestamp: 1234567890,
			};
			expect(eventData.type).toBe('user_action');
			expect(eventData.payload).toEqual({ action: 'click', target: 'button' });
			expect(eventData.timestamp).toBe(1234567890);
		});

		it('should allow optional timestamp', () => {
			const eventData: IMockEventData = {
				type: 'system_event',
				payload: 'system message',
			};
			expect(eventData.type).toBe('system_event');
			expect(eventData.payload).toBe('system message');
			expect(eventData.timestamp).toBeUndefined();
		});
	});
});
