<script lang="ts">
	/**
	 * PresetsManager - Sheet dialog for creating, editing, and managing presets.
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
	import { WandSparkles, Plus, Save, X, Copy, Trash2, Download, Upload } from '@lucide/svelte';
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
</script>

<Sheet.Root bind:open>
	<Sheet.Content class="flex flex-col">
		<Sheet.Header>
			<Sheet.Title class="flex items-center gap-2">
				<WandSparkles class="h-5 w-5" />
				Presets Manager
			</Sheet.Title>
			<Sheet.Description>
				Create and manage inference presets with custom system prompts and parameters.
			</Sheet.Description>
		</Sheet.Header>

		<div class="flex-1 overflow-y-auto px-4 pb-4 md:px-6">
			<!-- List View -->
			{#if viewMode === 'list' && !showImportExport}
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<h3 class="text-sm font-medium">Your Presets</h3>
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
						<div class="py-8 text-center text-sm text-muted-foreground">
							No presets yet. Create one to get started.
						</div>
					{:else}
						<div class="space-y-2">
							{#each presetList as preset (preset.id)}
								<div
									class="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
								>
									<div class="min-w-0 flex-1">
										<div class="flex items-center gap-2">
											<span class="truncate text-sm font-medium">{preset.name}</span>
											{#if preset.systemMessage}
												<span
													class="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
												>
													has system prompt
												</span>
											{/if}
										</div>
										<div class="mt-1 flex flex-wrap gap-1">
											{#if preset.params.temperature !== undefined}
												<span
													class="rounded bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
												>
													temp:{preset.params.temperature}
												</span>
											{/if}
											{#if preset.params.top_p !== undefined}
												<span
													class="rounded bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
												>
													top_p:{preset.params.top_p}
												</span>
											{/if}
											{#if preset.params.top_k !== undefined}
												<span
													class="rounded bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
												>
													top_k:{preset.params.top_k}
												</span>
											{/if}
											{#if preset.params.min_p !== undefined}
												<span
													class="rounded bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
												>
													min_p:{preset.params.min_p}
												</span>
											{/if}
											{#if preset.params.repeat_penalty !== undefined}
												<span
													class="rounded bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
												>
													rep:{preset.params.repeat_penalty}
												</span>
											{/if}
											{#if preset.params.max_tokens !== undefined}
												<span
													class="rounded bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
												>
													max:{preset.params.max_tokens}
												</span>
											{/if}
										</div>
									</div>
									<Button
										variant="ghost"
										size="sm"
										class="h-8 w-8 p-0"
										onclick={() => goToEdit(preset.id)}
									>
										<Save class="h-4 w-4" />
									</Button>
								</div>
							{/each}
						</div>
					{/if}

					<Button class="w-full gap-2" variant="outline" onclick={goToNew}>
						<Plus class="h-4 w-4" />
						Create new preset
					</Button>
				</div>
			{/if}

			<!-- Import View -->
			{#if showImportExport}
				<div class="space-y-4">
					<h3 class="text-sm font-medium">Import Presets</h3>
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
						<Button variant="ghost" size="sm" onclick={() => (showImportExport = false)}>
							Cancel
						</Button>
					</div>
				</div>
			{/if}

			<!-- Edit/Create Form -->
			{#if isFormVisible()}
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<h3 class="text-sm font-medium">
							{isNewMode() ? 'New Preset' : 'Edit Preset'}
						</h3>
						<div class="flex gap-2">
							{#if isEditMode()}
								<Button
									variant="ghost"
									size="sm"
									class="h-8 gap-1 text-xs"
									onclick={handleDuplicate}
								>
									<Copy class="h-3 w-3" />
									Duplicate
								</Button>
								<Button
									variant="ghost"
									size="sm"
									class="h-8 gap-1 text-xs text-destructive"
									onclick={handleDelete}
								>
									<Trash2 class="h-3 w-3" />
									Delete
								</Button>
							{/if}
						</div>
					</div>

					<div class="space-y-2">
						<Label for="preset-name">Name</Label>
						<Input
							id="preset-name"
							bind:value={formName}
							placeholder="e.g. Creative Writer, Code Assistant..."
						/>
					</div>

					<div class="space-y-2">
						<Label for="preset-system">System Message</Label>
						<Textarea
							id="preset-system"
							bind:value={formSystemMessage}
							rows={3}
							placeholder="You are a helpful assistant..."
						/>
						<p class="text-xs text-muted-foreground">
							Leave empty to use the global system message setting.
						</p>
					</div>

					<Separator />

					<h4 class="text-sm font-medium">Inference Parameters</h4>
					<p class="text-xs text-muted-foreground">
						Leave empty to use the global setting for each parameter.
					</p>

					<div class="grid grid-cols-2 gap-3">
						{#each paramFields as field (field.key)}
							<div class="space-y-1">
								<Label for={`param-${field.key}`} class="text-xs">{field.label}</Label>
								<Input
									id={`param-${field.key}`}
									type="text"
									value={formParams[field.key as keyof InferenceParams]?.toString() ?? ''}
									oninput={(e) => handleParamChange(field.key, e.currentTarget.value)}
									class="h-8 text-xs"
								/>
							</div>
						{/each}
					</div>

					<div class="flex items-center gap-2 pt-2">
						<Checkbox id="param-backend_sampling" bind:checked={formParams.backend_sampling} />
						<Label for="param-backend_sampling" class="text-xs">Backend sampling</Label>
					</div>

					<Separator />

					<div class="flex gap-2 pt-2">
						<Button class="flex-1 gap-2" onclick={handleSave}>
							<Save class="h-4 w-4" />
							{isNewMode() ? 'Create preset' : 'Save changes'}
						</Button>
						<Button variant="ghost" onclick={goToList}>
							<X class="h-4 w-4" />
						</Button>
					</div>
				</div>
			{/if}
		</div>
	</Sheet.Content>
</Sheet.Root>
