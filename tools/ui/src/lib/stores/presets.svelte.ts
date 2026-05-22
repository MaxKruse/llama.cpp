/**
 * presetsStore - Reactive state store for inference presets.
 *
 * Manages CRUD operations for named inference presets (system message + sampling
 * parameters). Presets are persisted to localStorage and can be activated per
 * conversation. Switching presets mid-conversation triggers a conversation branch.
 *
 * **Architecture:**
 * - **presetsStore** (this): Reactive state + business logic
 * - **conversationsStore**: Stores activePresetId per conversation
 * - **chatStore**: Applies preset params when sending messages
 * - **settingsStore**: Global fallback when no preset is active
 */

import { SvelteSet } from 'svelte/reactivity';
import { browser } from '$app/environment';
import { uuid } from '$lib/utils';
import type { InferencePreset, InferenceParams, PresetsStorage } from '$lib/types/presets';
import { PRESETS_LOCALSTORAGE_KEY } from '$lib/constants';

/** Keys whose values are stored as numbers in the API options. */
const NUMERIC_PARAM_KEYS: Set<string> = new Set([
	'temperature',
	'max_tokens',
	'top_k',
	'top_p',
	'min_p',
	'typ_p',
	'xtc_probability',
	'xtc_threshold',
	'dynatemp_range',
	'dynatemp_exponent',
	'repeat_last_n',
	'repeat_penalty',
	'presence_penalty',
	'frequency_penalty',
	'dry_multiplier',
	'dry_base',
	'dry_allowed_length',
	'dry_penalty_last_n'
]);

/** Keys that are boolean values. */
const BOOLEAN_PARAM_KEYS: Set<string> = new Set(['backend_sampling']);

function loadPresets(): InferencePreset[] {
	if (!browser) return [];
	try {
		const raw = localStorage.getItem(PRESETS_LOCALSTORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(p: unknown) =>
				typeof p === 'object' && p !== null && 'id' in p && 'name' in p && 'params' in p
		) as InferencePreset[];
	} catch {
		return [];
	}
}

function savePresets(presets: InferencePreset[]): void {
	if (!browser) return;
	try {
		localStorage.setItem(PRESETS_LOCALSTORAGE_KEY, JSON.stringify(presets));
	} catch {
		console.error('Failed to save presets to localStorage');
	}
}

/**
 * Derive a short description of a preset's active parameter overrides.
 */
export function getPresetParamSummary(preset: InferencePreset): string[] {
	const parts: string[] = [];
	const p = preset.params;
	if (p.temperature !== undefined) parts.push(`temp:${p.temperature}`);
	if (p.top_p !== undefined) parts.push(`top_p:${p.top_p}`);
	if (p.top_k !== undefined) parts.push(`top_k:${p.top_k}`);
	if (p.min_p !== undefined) parts.push(`min_p:${p.min_p}`);
	if (p.repeat_penalty !== undefined) parts.push(`rep_pen:${p.repeat_penalty}`);
	if (p.presence_penalty !== undefined) parts.push(`pres_pen:${p.presence_penalty}`);
	if (p.frequency_penalty !== undefined) parts.push(`freq_pen:${p.frequency_penalty}`);
	if (p.max_tokens !== undefined) parts.push(`max_tok:${p.max_tokens}`);
	return parts;
}

/**
 * Truncate system message preview to first ~60 chars.
 */
export function getSystemMessagePreview(systemMessage: string): string {
	if (!systemMessage) return '';
	const trimmed = systemMessage.trim();
	return trimmed.length > 60 ? trimmed.slice(0, 60) + '…' : trimmed;
}

class PresetsStore {
	presets = $state<InferencePreset[]>([]);
	activePresetId = $state<string | null>(null);
	isInitialized = $state(false);

	constructor() {
		if (browser) {
			this.initialize();
		}
	}

	/** Load presets from localStorage. */
	private initialize(): void {
		try {
			this.presets = loadPresets();
			this.isInitialized = true;
		} catch (error) {
			console.error('Failed to initialize presets store:', error);
			this.presets = [];
			this.isInitialized = true;
		}
	}

	/** Persist current presets array to localStorage. */
	private persist(): void {
		savePresets(this.presets);
	}

	/**
	 * Create a new preset and return its ID.
	 */
	createPreset(name: string, systemMessage: string, params: InferenceParams): string {
		const id = uuid();
		const preset: InferencePreset = {
			id,
			name: name.trim() || 'Untitled',
			systemMessage: systemMessage || '',
			params: { ...params },
			updatedAt: Date.now()
		};
		this.presets = [preset, ...this.presets];
		this.persist();
		return id;
	}

	/**
	 * Update an existing preset by ID.
	 */
	updatePreset(
		id: string,
		updates: { name?: string; systemMessage?: string; params?: InferenceParams }
	): boolean {
		const index = this.presets.findIndex((p) => p.id === id);
		if (index === -1) return false;

		const existing = this.presets[index];
		const updated: InferencePreset = {
			...existing,
			name: updates.name ?? existing.name,
			systemMessage: updates.systemMessage ?? existing.systemMessage,
			params: updates.params ? { ...existing.params, ...updates.params } : existing.params,
			updatedAt: Date.now()
		};

		const newPresets = [...this.presets];
		newPresets[index] = updated;
		this.presets = newPresets;
		this.persist();
		return true;
	}

	/**
	 * Delete a preset by ID. Clears activePresetId if it was the active one.
	 */
	deletePreset(id: string): boolean {
		const index = this.presets.findIndex((p) => p.id === id);
		if (index === -1) return false;

		this.presets = this.presets.filter((p) => p.id !== id);
		this.persist();

		if (this.activePresetId === id) {
			this.activePresetId = null;
		}
		return true;
	}

	/**
	 * Get a preset by ID.
	 */
	getPreset(id: string): InferencePreset | undefined {
		return this.presets.find((p) => p.id === id);
	}

	/**
	 * Get the currently active preset (or null).
	 */
	getActivePreset(): InferencePreset | null {
		if (!this.activePresetId) return null;
		return this.getPreset(this.activePresetId) ?? null;
	}

	/**
	 * Set the active preset. Returns true if the preset exists.
	 */
	setActivePreset(id: string | null): boolean {
		if (id === null) {
			this.activePresetId = null;
			return true;
		}
		if (!this.presets.find((p) => p.id === id)) return false;
		this.activePresetId = id;
		return true;
	}

	/**
	 * Duplicate a preset with a new name.
	 */
	duplicatePreset(id: string, newName?: string): string | null {
		const source = this.getPreset(id);
		if (!source) return null;

		const name = newName?.trim() || `${source.name} (copy)`;
		return this.createPreset(name, source.systemMessage, { ...source.params });
	}

	/**
	 * Build merged API options by layering preset params over the base config.
	 * The preset overrides only the fields it defines.
	 */
	getMergedApiOptions(): InferenceParams {
		const preset = this.getActivePreset();
		if (!preset) return {};

		const merged: InferenceParams = {};
		const p = preset.params;

		for (const [key, value] of Object.entries(p)) {
			if (value === undefined || value === '') continue;

			if (NUMERIC_PARAM_KEYS.has(key)) {
				const num = Number(value);
				if (!isNaN(num)) {
					(merged as Record<string, number>)[key] = num;
				}
			} else if (BOOLEAN_PARAM_KEYS.has(key)) {
				(merged as Record<string, boolean>)[key] = Boolean(value);
			} else {
				(merged as Record<string, string>)[key] = String(value);
			}
		}

		return merged;
	}

	/**
	 * Get the system message to use — preset override or fallback to global config.
	 */
	getSystemMessage(globalSystemMessage: string | undefined): string {
		const preset = this.getActivePreset();
		if (preset && preset.systemMessage) {
			return preset.systemMessage;
		}
		return globalSystemMessage || '';
	}

	/**
	 * Export presets as JSON string.
	 */
	exportPresets(): string {
		return JSON.stringify(this.presets, null, 2);
	}

	/**
	 * Import presets from JSON. Merges with existing — skips presets with duplicate IDs.
	 */
	importPresets(json: string): { imported: number; skipped: number } {
		try {
			const parsed = JSON.parse(json) as PresetsStorage;
			if (!Array.isArray(parsed)) {
				throw new Error('Invalid preset data: expected array');
			}

			const existingIds = new SvelteSet(this.presets.map((p) => p.id));
			let imported = 0;
			let skipped = 0;

			for (const item of parsed) {
				if (
					typeof item !== 'object' ||
					item === null ||
					!('id' in item) ||
					!('name' in item) ||
					!('params' in item)
				) {
					skipped++;
					continue;
				}

				if (existingIds.has(item.id)) {
					skipped++;
					continue;
				}

				existingIds.add(item.id);
				this.presets.push({
					id: item.id,
					name: item.name,
					systemMessage: item.systemMessage || '',
					params: item.params || {},
					updatedAt: item.updatedAt || Date.now()
				});
				imported++;
			}

			if (imported > 0) {
				this.persist();
			}

			return { imported, skipped };
		} catch (error) {
			console.error('Failed to import presets:', error);
			throw error;
		}
	}
}

export const presetsStore = new PresetsStore();

export const presets = () => presetsStore.presets;
export const activePresetId = () => presetsStore.activePresetId;
export const activePreset = () => presetsStore.getActivePreset();
export const isPresetsInitialized = () => presetsStore.isInitialized;
