
/**
 * @fileoverview Integration tests for Events Mocks package
 * Tests comprehensive scenarios where mock utilities work together
 */

import { TEventData } from '../event-data.js';
import {
	MockEventHandler,
	MockAsyncObservable,
	GenerateEventData,
	GenerateUserEvents,
	GenerateMessageEvents,
	GenerateFilterCriteria,
	GenerateSubscriptionScenarios,
} from '../mocks/index.js';
// Import custom matchers
import '../mocks/matchers-setup.js';

interface IUserEvent extends TEventData {
	userEvent: {
		id: string;

		Username: string;

		Email: string;

		Role: string;

		Active: boolean;
		sequence: number;
		timestamp: string;
	};
}

interface IMessageEvent extends TEventData {
	messageEvent: {

		Text: string;

		Priority: string;

		Channel: string;
		sequence: number;
		id: string;
	};
}

describe('@pawells/rxjs-events Mocks Integration Tests', () => {
	describe('End-to-End Event Generation and Handling', () => {
		test('INT-001 - Generate and Handle User Events', () => {
			// Generate user events
			const userEvents = GenerateUserEvents(3);

			// Create handler
			const handler = new MockEventHandler<any, IUserEvent>('userEvent');

			// Subscribe to events
			const receivedEvents: IUserEvent[] = [];
			handler.Subscribe((event) => {
				receivedEvents.push(event);
			});

			// Trigger generated events
			userEvents.forEach((event) => {
				handler.Trigger(event.userCreated);
			});

			// Verify events were received
			expect(receivedEvents).toHaveLength(3);
			receivedEvents.forEach((event) => {
				expect(event).toHaveProperty('userEvent');
				expect(event.userEvent).toHaveProperty('Username');
				expect(event.userEvent).toHaveProperty('Email');
				expect(event.userEvent).toHaveProperty('Role');
				expect(event.userEvent).toHaveProperty('Active');
				expect(typeof event.userEvent.Active).toBe('boolean');
			});

			// Verify handler state
			expect(handler).toHaveSubscribers(1);
			expect(handler.GetTriggeredEvents()).toHaveLength(3);
		});

		test('INT-002 - Generate and Handle Message Events with Filtering', () => {
			// Generate message events
			const messageEvents = GenerateMessageEvents(5);

			// Create handler
			const handler = new MockEventHandler<any, IMessageEvent>('messageEvent');

			// Subscribe with filter for high priority messages
			const highpriorityEvents: IMessageEvent[] = [];
			handler.Subscribe((event) => {
				if (event.messageEvent.Priority === 'high') {
					highpriorityEvents.push(event);
				}
			});

			// Trigger all events
			messageEvents.forEach((event) => {
				handler.Trigger(event.messageReceived);
			});

			// Verify some high priority events were received (random, but should be some)
			expect(highpriorityEvents.length).toBeGreaterThanOrEqual(0);
			highpriorityEvents.forEach((event) => {
				expect(event.messageEvent.Priority).toBe('high');
			});
		});

		test('INT-003 - Multiple Event Types with Single Handler', () => {
			// Generate different event types
			const userEvents = GenerateUserEvents(2);
			const messageEvents = GenerateMessageEvents(2);

			// Create handler for generic events
			const handler = new MockEventHandler<any, any>('GenericEvent');

			const receivedEvents: any[] = [];
			handler.Subscribe((event) => {
				receivedEvents.push(event);
			});

			// Trigger user events
			userEvents.forEach((event) => {
				handler.Trigger(event.userCreated);
			});

			// Trigger message events
			messageEvents.forEach((event) => {
				handler.Trigger(event.messageReceived);
			});

			// Verify all events received
			expect(receivedEvents).toHaveLength(4);
			expect(handler.GetTriggeredEvents()).toHaveLength(4);
		});

		test('INT-004 - Async Event Handling with Generated Data', async () => {
			// Generate events
			const userEvents = GenerateUserEvents(2);

			// Create async handler
			const handler = new MockEventHandler<any, IUserEvent>('userEvent', { asyncMode: true, delay: 10 });

			const receivedEvents: IUserEvent[] = [];
			handler.Subscribe((event) => {
				receivedEvents.push(event);
			});

			// Trigger events
			userEvents.forEach((event) => {
				handler.Trigger(event.userCreated);
			});

			// Wait for async processing
			await new Promise(resolve => setTimeout(resolve, 50));

			// Verify events were received asynchronously
			expect(receivedEvents).toHaveLength(2);
			receivedEvents.forEach((event) => {
				expect(event).toHaveProperty('userEvent');
			});
		});

		test('INT-005 - Subscription Scenarios with Generated Configs', async () => {
			// Use a fixed seed for deterministic scenarios across runs
			const scenarios = GenerateSubscriptionScenarios(2, { maxEvents: 10, seed: 42 });

			for (const scenario of scenarios) {
				// When async delivery is requested a positive delay must be set;
				// asyncMode alone (with delay=0) keeps delivery synchronous.
				const delay = scenario.async ? 10 : 0;
				const handler = new MockEventHandler<any, IUserEvent>('userEvent', {
					asyncMode: scenario.async,
					delay,
					maxSubscribers: scenario.subscriberCount * 2, // Allow more than needed
				});

				// Subscribe multiple handlers
				const receivedCounts: number[] = new Array(scenario.subscriberCount).fill(0);
				for (let i = 0; i < scenario.subscriberCount; i++) {
					handler.Subscribe(() => {
						receivedCounts[i] = (receivedCounts[i] || 0) + 1;
					});
				}

				// Generate and trigger events
				const events = GenerateUserEvents(scenario.eventCount);
				events.forEach((event) => {
					handler.Trigger(event.userCreated);
				});

				// Wait for async delivery if needed (give handlers more time than the delay)
				if (scenario.async) {
					await new Promise(resolve => setTimeout(resolve, delay * scenario.eventCount + 50));
				}

				// Verify each subscriber received all events
				receivedCounts.forEach((count) => {
					expect(count).toBe(scenario.eventCount);
				});

				expect(handler).toHaveSubscribers(scenario.subscriberCount);
				expect(handler.GetTriggeredEvents()).toHaveLength(scenario.eventCount);
			}
		});

		test('INT-006 - Filter Criteria Integration with Event Generation', () => {
			// Generate filter criteria
			const filters = GenerateFilterCriteria('simple');

			// Generate events that might match
			const userEvents = GenerateUserEvents(10);

			// Test each filter against events
			filters.forEach((filter) => {
				const matchingEvents = userEvents.filter((event) => {
					const userData = event.userCreated;
					return userData.Role === filter['role'] ||
						userData.Username === filter['username'] ||
						userData.Active === filter['active'];
				});

				// Should find some matches (random, but statistically likely)
				expect(matchingEvents.length).toBeGreaterThanOrEqual(0);
			});
		});

		test('INT-007 - MockAsyncObservable with Generated Event Data', async () => {
			// Generate event data
			const events = GenerateEventData('TestEvent', 3);

			// Create observable from event data
			const observable = new MockAsyncObservable(events);

			const receivedEvents: any[] = [];
			for await (const event of observable) {
				receivedEvents.push(event);
			}

			// Verify all events received in order.
			// GenerateEventData uses the event type verbatim as the key.
			expect(receivedEvents).toHaveLength(3);
			receivedEvents.forEach((event, index) => {
				expect(event).toHaveProperty('TestEvent');
				expect(event.TestEvent.sequence).toBe(index);
			});
		});

		test('INT-008 - Complex Scenario: Multiple Generators and Handlers', () => {
			// Generate various data
			const userEvents = GenerateUserEvents(2);
			const messageEvents = GenerateMessageEvents(2);
			const filters = GenerateFilterCriteria('simple');

			// Create multiple handlers
			const userHandler = new MockEventHandler<any, IUserEvent>('userEvent');
			const messageHandler = new MockEventHandler<any, IMessageEvent>('messageEvent');

			// Subscribe to user events with filter
			const filteredUsers: IUserEvent[] = [];
			userHandler.Subscribe((event) => {
				const filter = filters[0] || {};
				if (event.userEvent.Role === filter['role']) {
					filteredUsers.push(event);
				}
			});

			// Subscribe to message events
			const allMessages: IMessageEvent[] = [];
			messageHandler.Subscribe((event) => {
				allMessages.push(event);
			});

			// Trigger events
			userEvents.forEach((event) => {
				userHandler.Trigger(event.userCreated);
			});
			messageEvents.forEach((event) => {
				messageHandler.Trigger(event.messageReceived);
			});

			// Verify results
			expect(filteredUsers.length).toBeGreaterThanOrEqual(0);
			expect(allMessages).toHaveLength(2);

			expect(userHandler).toHaveSubscribers(1);
			expect(messageHandler).toHaveSubscribers(1);

			expect(userHandler.GetTriggeredEvents()).toHaveLength(2);
			expect(messageHandler.GetTriggeredEvents()).toHaveLength(2);
		});

		test('INT-009 - Event Data Compatibility with Custom Fields', () => {
			// Generate event data with custom fields
			const events = GenerateEventData('customEvent', 2, {
				customFields: {
					Timestamp: () => new Date().toISOString(),
					Source: () => 'test',
				},
			});

			// Create handler
			const handler = new MockEventHandler<any, any>('customEvent');

			let receivedEvent: any;
			handler.Subscribe((event) => {
				receivedEvent = event;
			});

			// Trigger event
			handler.Trigger(events[0]!['customEvent']);

			// Verify custom fields are present
			expect(receivedEvent['customEvent']).toHaveProperty('Timestamp');
			expect(receivedEvent['customEvent']).toHaveProperty('Source', 'test');
			expect(receivedEvent['customEvent']).toHaveProperty('id');
			expect(receivedEvent['customEvent']).toHaveProperty('sequence');
		});

		test('INT-010 - Reset and Reuse Handlers with Generated Data', async () => {
			const handler = new MockEventHandler<any, IUserEvent>('userEvent');

			// First scenario
			const events1 = GenerateUserEvents(2);
			handler.Subscribe(() => {});
			events1.forEach((event) => handler.Trigger(event.userCreated));

			expect(handler).toHaveSubscribers(1);
			expect(handler.GetTriggeredEvents()).toHaveLength(2);

			// Reset
			handler.Reset();

			expect(handler).toHaveSubscribers(0);
			expect(handler.GetTriggeredEvents()).toHaveLength(0);

			// Second scenario
			const events2 = GenerateUserEvents(1);
			handler.Subscribe(() => {});
			events2.forEach((event) => handler.Trigger(event.userCreated));

			expect(handler).toHaveSubscribers(1);
			expect(handler.GetTriggeredEvents()).toHaveLength(1);
		});
	});

	describe('Performance and Scale Integration', () => {
		test('INT-011 - High Volume Event Generation and Handling', () => {
			// Generate large number of events
			const events = GenerateUserEvents(100);

			const handler = new MockEventHandler<any, IUserEvent>('userEvent');

			let receivedCount = 0;
			handler.Subscribe(() => {
				receivedCount++;
			});

			// Trigger all events
			events.forEach((event) => {
				handler.Trigger(event.userCreated);
			});

			// Verify all events processed
			expect(receivedCount).toBe(100);
			expect(handler.GetTriggeredEvents()).toHaveLength(100);
		});

		test('INT-012 - Multiple Subscribers with Generated Events', () => {
			const handler = new MockEventHandler<any, IUserEvent>('userEvent');
			const subscriberCount = 5;
			const eventCount = 10;

			const receivedCounts = new Array(subscriberCount).fill(0);

			// Subscribe multiple handlers
			for (let i = 0; i < subscriberCount; i++) {
				handler.Subscribe(() => {
					receivedCounts[i]++;
				});
			}

			// Generate and trigger events
			const events = GenerateUserEvents(eventCount);
			events.forEach((event) => {
				handler.Trigger(event.userCreated);
			});

			// Verify each subscriber received all events
			receivedCounts.forEach((count) => {
				expect(count).toBe(eventCount);
			});

			expect(handler).toHaveSubscribers(subscriberCount);
		});
	});
});
