<script lang="ts">
	/**
	 * PresetsManager - Sheet dialog for creating, editing, and managing presets.
	 * Features a spacious layout with sticky save button and organized sections.
	 */

	import { presetsStore, presets } from '$lib/stores/presets.svelte';
	import { config } from '$lib/stores/settings.svelte';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Button } from '$lib/components/ui/button';
	import Input from '$lib/components/ui/input/input.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import {
		WandSparkles,
		Plus,
		Save,
		X,
		Copy,
		Trash2,
		Download,
		Upload,
		Edit,
		Check
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import type { InferenceParams } from '$lib/types/presets';

	interface Props {
		open?: boolean;
	}

	let { open = $bindable(false) }: Props = $props();

	let viewMode = $state<'list' | `edit-${string}` | 'new'>('list');
	let formName = $state('');
	let formSystemMessage = $state('');
	let formParams = $state<InferenceParams>({});
	let showImportExport = $state(false);
	let importJson = $state('');

	const importPlaceholder = '[{"id":"...","name":"...","systemMessage":"...","params":{}}]';

	let presetList = $derived(presets());
	let currentConfig = $derived(config());
	let activePresetId = $derived(presetsStore.activePresetId);

	function getEditingId(): string | null {
		if (viewMode === 'new' || viewMode === 'list') return null;
		if (viewMode.startsWith('edit-')) return viewMode.slice(5);
		return null;
	}

	function isEditMode(): boolean {
		return viewMode !== 'list' && viewMode !== 'new';
	}

	function isNewMode(): boolean {
		return viewMode === 'new';
	}

	function isFormVisible(): boolean {
		return viewMode !== 'list';
	}

	function goToList(): void {
		viewMode = 'list';
		showImportExport = false;
	}

	function goToNew(): void {
		showImportExport = false;
		viewMode = 'new';
		formName = '';
		formSystemMessage = currentConfig.systemMessage?.toString() || '';
		formParams = {
			temperature: currentConfig.temperature ?? undefined,
			top_p: currentConfig.top_p ?? undefined,
			top_k: currentConfig.top_k ?? undefined,
			min_p: currentConfig.min_p ?? undefined,
			repeat_penalty: currentConfig.repeat_penalty ?? undefined,
			presence_penalty: currentConfig.presence_penalty ?? undefined,
			frequency_penalty: currentConfig.frequency_penalty ?? undefined,
			max_tokens: currentConfig.max_tokens ?? undefined,
			backend_sampling: currentConfig.backend_sampling
		};
	}

	function goToEdit(id: string): void {
		const p = presetsStore.getPreset(id);
		if (!p) return;
		showImportExport = false;
		viewMode = `edit-${id}`;
		formName = p.name;
		formSystemMessage = p.systemMessage;
		formParams = { ...p.params };
	}

	function handleSave(): void {
		if (!formName.trim()) {
			toast.error('Preset name is required');
			return;
		}
		const editingId = getEditingId();
		if (editingId) {
			if (
				presetsStore.updatePreset(editingId, {
					name: formName,
					systemMessage: formSystemMessage,
					params: formParams
				})
			) {
				toast.success(`Preset "${formName}" updated`);
			}
		} else {
			presetsStore.createPreset(formName, formSystemMessage, formParams);
			toast.success(`Preset "${formName}" created`);
		}
		open = false;
	}

	function handleDelete(): void {
		const editingId = getEditingId();
		if (!editingId) return;
		const p = presetsStore.getPreset(editingId);
		if (p && presetsStore.deletePreset(editingId)) {
			toast.success(`Preset "${p.name}" deleted`);
			open = false;
		}
	}

	function handleDeleteFromList(id: string): void {
		const p = presetsStore.getPreset(id);
		if (p && presetsStore.deletePreset(id)) {
			toast.success(`Preset "${p.name}" deleted`);
		}
	}

	function handleDuplicate(): void {
		const editingId = getEditingId();
		if (!editingId) return;
		const newId = presetsStore.duplicatePreset(editingId);
		if (newId) {
			const np = presetsStore.getPreset(newId);
			toast.success(`Preset "${np?.name}" created`);
			goToEdit(newId);
		}
	}

	function handleParamChange(key: string, value: string): void {
		if (value === '') {
			const updated = { ...formParams };
			delete updated[key as keyof InferenceParams];
			formParams = updated;
		} else {
			formParams = { ...formParams, [key]: value };
		}
	}

	function handleExport(): void {
		try {
			const json = presetsStore.exportPresets();
			const blob = new Blob([json], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `llama-presets-${new Date().toISOString().split('T')[0]}.json`;
			a.click();
			URL.revokeObjectURL(url);
			toast.success('Presets exported');
		} catch {
			toast.error('Failed to export presets');
		}
	}

	function handleImport(): void {
		try {
			const result = presetsStore.importPresets(importJson);
			toast.success(`Imported ${result.imported} preset(s), skipped ${result.skipped}`);
			importJson = '';
			showImportExport = false;
		} catch {
			toast.error('Failed to import presets');
		}
	}

	const paramFields = [
		{ key: 'temperature', label: 'Temperature' },
		{ key: 'max_tokens', label: 'Max Tokens' },
		{ key: 'top_k', label: 'Top K' },
		{ key: 'top_p', label: 'Top P' },
		{ key: 'min_p', label: 'Min P' },
		{ key: 'typ_p', label: 'Typical P' },
		{ key: 'xtc_probability', label: 'XTC Probability' },
		{ key: 'xtc_threshold', label: 'XTC Threshold' },
		{ key: 'dynatemp_range', label: 'Dynatemp Range' },
		{ key: 'dynatemp_exponent', label: 'Dynatemp Exponent' },
		{ key: 'repeat_last_n', label: 'Repeat Last N' },
		{ key: 'repeat_penalty', label: 'Repeat Penalty' },
		{ key: 'presence_penalty', label: 'Presence Penalty' },
		{ key: 'frequency_penalty', label: 'Frequency Penalty' },
		{ key: 'dry_multiplier', label: 'DRY Multiplier' },
		{ key: 'dry_base', label: 'DRY Base' },
		{ key: 'dry_allowed_length', label: 'DRY Allowed Length' },
		{ key: 'dry_penalty_last_n', label: 'DRY Penalty Last N' }
	];

	// Get param summary for list view
	function getParamSummary(p: { params: InferenceParams }): string[] {
		const parts: string[] = [];
		const params = p.params;
		if (params.temperature !== undefined) parts.push(`temp:${params.temperature}`);
		if (params.top_p !== undefined) parts.push(`top_p:${params.top_p}`);
		if (params.top_k !== undefined) parts.push(`top_k:${params.top_k}`);
		if (params.min_p !== undefined) parts.push(`min_p:${params.min_p}`);
		if (params.repeat_penalty !== undefined) parts.push(`rep:${params.repeat_penalty}`);
		if (params.max_tokens !== undefined) parts.push(`max:${params.max_tokens}`);
		return parts;
	}

	// Get system message preview
	function getSystemPreview(systemMessage: string): string {
		if (!systemMessage) return '';
		const trimmed = systemMessage.trim();
		return trimmed.length > 80 ? trimmed.slice(0, 80) + '…' : trimmed;
	}
</script>

<Sheet.Root bind:open>
	<Sheet.Content class="flex flex-col">
		<!-- Sticky Header -->
		<div class="border-b px-4 py-3 md:px-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<WandSparkles class="h-5 w-5" />
					<h2 class="text-lg font-semibold">Presets Manager</h2>
					{#if presetList.length > 0}
						<Badge variant="secondary" class="ml-1">
							{presetList.length}
						</Badge>
					{/if}
				</div>
				{#if isFormVisible()}
					<Button variant="ghost" size="sm" class="h-8 w-8 p-0" onclick={goToList}>
						<X class="h-4 w-4" />
					</Button>
				{/if}
			</div>
		</div>

		<!-- Scrollable Content -->
		<div class="flex-1 overflow-y-auto px-4 py-4 md:px-6">
			<!-- List View -->
			{#if viewMode === 'list' && !showImportExport}
				<div class="space-y-4">
					<!-- Actions Bar -->
					<div class="flex items-center justify-between">
						<p class="text-sm text-muted-foreground">
							Manage inference presets with custom system prompts and parameters.
						</p>
						<div class="flex gap-2">
							<Button variant="outline" size="sm" class="h-8 gap-1 text-xs" onclick={handleExport}>
								<Download class="h-3 w-3" />
								Export
							</Button>
							<Button
								variant="outline"
								size="sm"
								class="h-8 gap-1 text-xs"
								onclick={() => (showImportExport = true)}
							>
								<Upload class="h-3 w-3" />
								Import
							</Button>
						</div>
					</div>

					{#if presetList.length === 0}
						<div class="flex flex-col items-center justify-center py-12 text-center">
							<div class="rounded-full bg-muted p-4">
								<WandSparkles class="h-8 w-8 text-muted-foreground" />
							</div>
							<h3 class="mt-4 text-sm font-medium">No presets yet</h3>
							<p class="mt-1 max-w-xs text-xs text-muted-foreground">
								Create a preset to save your favorite system prompts and inference parameters.
							</p>
							<Button class="mt-4 gap-2" onclick={goToNew}>
								<Plus class="h-4 w-4" />
								Create your first preset
							</Button>
						</div>
					{:else}
						<div class="space-y-2">
							{#each presetList as preset (preset.id)}
								<div
									class="group/preset relative flex items-start gap-3 rounded-lg border p-4 transition-all hover:bg-muted/30 {activePresetId === preset.id ? 'border-primary/50 bg-primary/5' : ''}"
								>
									<!-- Active indicator -->
									{#if activePresetId === preset.id}
										<div class="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-primary"></div>
									{/if}

									<div class="min-w-0 flex-1 space-y-2">
										<!-- Name row -->
										<div class="flex items-center gap-2">
											<span class="truncate text-sm font-medium">{preset.name}</span>
											{#if activePresetId === preset.id}
												<Badge variant="default" class="h-5 px-1.5 text-[10px]">
													<Check class="mr-0.5 h-2.5 w-2.5" />
													Active
												</Badge>
											{/if}
											{#if preset.systemMessage}
												<Badge variant="secondary" class="h-5 px-1.5 text-[10px]">
													has system prompt
												</Badge>
											{/if}
										</div>

										<!-- System message preview -->
										{#if preset.systemMessage}
											<p class="line-clamp-2 text-xs text-muted-foreground">
												{getSystemPreview(preset.systemMessage)}
											</p>
										{/if}

										<!-- Param badges -->
										<div class="flex flex-wrap gap-1">
											{#each getParamSummary(preset) as param (param)}
												<span
													class="rounded bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
												>
													{param}
												</span>
											{/each}
										</div>
									</div>

									<!-- Actions -->
									<div class="flex flex-col gap-1 opacity-0 transition-opacity group-hover/preset:opacity-100">
										<Button
											variant="ghost"
											size="sm"
											class="h-7 w-7 p-0"
											onclick={() => goToEdit(preset.id)}
											title="Edit"
										>
											<Edit class="h-3.5 w-3.5" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											class="h-7 w-7 p-0 text-destructive hover:text-destructive"
											onclick={() => handleDeleteFromList(preset.id)}
											title="Delete"
										>
											<Trash2 class="h-3.5 w-3.5" />
										</Button>
									</div>
								</div>
							{/each}
						</div>

						<Button class="w-full gap-2" variant="outline" onclick={goToNew}>
							<Plus class="h-4 w-4" />
							Create new preset
						</Button>
					{/if}
				</div>
			{/if}

			<!-- Import View -->
			{#if showImportExport}
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<h3 class="text-sm font-medium">Import Presets</h3>
						<Button variant="ghost" size="sm" onclick={() => (showImportExport = false)}>
							<X class="h-4 w-4" />
						</Button>
					</div>
					<Label for="import-json">Paste JSON</Label>
					<Textarea
						id="import-json"
						bind:value={importJson}
						rows={10}
						class="font-mono text-xs"
						placeholder={importPlaceholder}
					/>
					<div class="flex gap-2">
						<Button size="sm" onclick={handleImport}>
							<Upload class="mr-2 h-4 w-4" />
							Import
						</Button>
						<Button variant="outline" size="sm" onclick={() => (showImportExport = false)}>
							Cancel
						</Button>
					</div>
				</div>
			{/if}

			<!-- Edit/Create Form -->
			{#if isFormVisible()}
				<div class="space-y-6">
					<!-- Form Header -->
					<div class="flex items-center justify-between">
						<h3 class="text-sm font-medium">
							{isNewMode() ? 'Create New Preset' : 'Edit Preset'}
						</h3>
						{#if isEditMode()}
							<div class="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									class="h-8 gap-1 text-xs"
									onclick={handleDuplicate}
								>
									<Copy class="h-3 w-3" />
									Duplicate
								</Button>
								<Button
									variant="outline"
									size="sm"
									class="h-8 gap-1 text-xs text-destructive hover:text-destructive"
									onclick={handleDelete}
								>
									<Trash2 class="h-3 w-3" />
									Delete
								</Button>
							</div>
						{/if}
					</div>

					<!-- Basic Info Section -->
					<div class="space-y-4">
						<h4 class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
							Basic Info
						</h4>

						<div class="space-y-2">
							<Label for="preset-name">Name *</Label>
							<Input
								id="preset-name"
								bind:value={formName}
								placeholder="e.g. Creative Writer, Code Assistant..."
								class="h-10"
							/>
						</div>

						<div class="space-y-2">
							<Label for="preset-system">System Message</Label>
							<Textarea
								id="preset-system"
								bind:value={formSystemMessage}
								rows={4}
								placeholder="You are a helpful assistant..."
								class="resize-none"
							/>
							<p class="text-xs text-muted-foreground">
								Leave empty to use the global system message setting.
							</p>
						</div>
					</div>

					<Separator />

					<!-- Parameters Section -->
					<div class="space-y-4">
						<div>
							<h4 class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
								Inference Parameters
							</h4>
							<p class="text-xs text-muted-foreground">
								Leave empty to use the global setting for each parameter.
							</p>
						</div>

						<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
							{#each paramFields as field (field.key)}
								<div class="space-y-1.5">
									<Label for={`param-${field.key}`} class="text-xs">{field.label}</Label>
									<Input
										id={`param-${field.key}`}
										type="text"
										inputmode="decimal"
										value={formParams[field.key as keyof InferenceParams]?.toString() ?? ''}
										oninput={(e) => handleParamChange(field.key, e.currentTarget.value)}
										class="h-9 text-xs"
									/>
								</div>
							{/each}
						</div>

						<div class="flex items-center gap-2 pt-2">
							<Checkbox id="param-backend_sampling" bind:checked={formParams.backend_sampling} />
							<Label for="param-backend_sampling" class="text-xs">Backend sampling</Label>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Sticky Footer with Save Button -->
		{#if isFormVisible()}
			<div class="border-t bg-background px-4 py-3 md:px-6">
				<div class="flex items-center justify-between">
					<Button variant="ghost" onclick={goToList}>
						Cancel
					</Button>
					<Button
						class="gap-2"
						onclick={handleSave}
						disabled={!formName.trim()}
					>
						<Save class="h-4 w-4" />
						{isNewMode() ? 'Create Preset' : 'Save Changes'}
					</Button>
				</div>
			</div>
		{/if}
	</Sheet.Content>
</Sheet.Root>
