/**
 * Inference preset types for the WebUI presets feature.
 *
 * A preset bundles a system message and inference parameters (temperature,
 * sampling, penalties, etc.) into a single reusable profile. Users can
 * switch presets before sending a message — if the preset differs from the
 * one used for the current conversation a branch is created.
 */

/** Inference parameters that can be stored in a preset. */
export interface InferenceParams {
	temperature?: string | number;
	max_tokens?: string | number;
	top_k?: string | number;
	top_p?: string | number;
	min_p?: string | number;
	typ_p?: string | number;
	xtc_probability?: string | number;
	xtc_threshold?: string | number;
	dynatemp_range?: string | number;
	dynatemp_exponent?: string | number;
	repeat_last_n?: string | number;
	repeat_penalty?: string | number;
	presence_penalty?: string | number;
	frequency_penalty?: string | number;
	dry_multiplier?: string | number;
	dry_base?: string | number;
	dry_allowed_length?: string | number;
	dry_penalty_last_n?: string | number;
	samplers?: string;
	backend_sampling?: boolean;
	custom?: string;
}

/** A named inference preset stored in localStorage. */
export interface InferencePreset {
	/** Stable unique identifier (UUID v4). */
	id: string;
	/** Human-readable name displayed in the picker. */
	name: string;
	/** Optional system prompt override. Empty string means "use global setting". */
	systemMessage: string;
	/** Inference parameter overrides — only set values differ from defaults. */
	params: InferenceParams;
	/** Timestamp of last modification (unix ms). */
	updatedAt: number;
}

/** Shape of the presets array stored in localStorage. */
export type PresetsStorage = InferencePreset[];

/**
 * Keys of InferenceParams — used to iterate preset parameter fields.
 */
export type InferenceParamKey = keyof InferenceParams;
