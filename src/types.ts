/**
 * Event handler callback function type
 * @template TPayload - The type of event payload
 * @param payload - The event data
 * @returns void or Promise<void>
 */
export type TEventHandler<TPayload = unknown> = (payload: TPayload) => void | Promise<void>;

/**
 * Event subscription options
 * @remarks `once` and `priority` are reserved for a future release and are not yet implemented
 * by `EventHandler`. Passing these options currently has no effect.
 * @internal Not part of the public API until implemented; not re-exported from the package entry point.
 */
export interface ISubscriptionOptions {
	/** Whether to call the handler only once (not yet implemented) */
	once?: boolean;
	/** Priority for handler execution, higher = earlier (not yet implemented) */
	priority?: number;
}
