import { expect } from 'vitest';
import { ToHaveSubscribers } from './matcher-to-have-subscribers.js';
import { ToHaveTriggeredEvent } from './matcher-to-have-triggered-event.js';
import { ToMatchEventFilter } from './matcher-to-match-event-filter.js';

expect.extend({
	toHaveSubscribers: ToHaveSubscribers,
	toHaveTriggeredEvent: ToHaveTriggeredEvent,
	toMatchEventFilter: ToMatchEventFilter,
});
