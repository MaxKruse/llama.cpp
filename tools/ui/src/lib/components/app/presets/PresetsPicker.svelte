<script lang="ts">
	/**
	 * PresetsPicker - Dropdown for selecting an active inference preset.
	 */

	import { presetsStore, presets, activePreset } from '$lib/stores/presets.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { WandSparkles, ChevronDown, Plus, Settings2, Trash2, Copy } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import PresetsManager from './PresetsManager.svelte';

	interface Props {
		disabled?: boolean;
		class?: string;
	}

	let { disabled = false, class: className = '' }: Props = $props();

	let managerOpen = $state(false);

	let currentPresets = $derived(presets());
	let currentActive = $derived(activePreset());

	let activeLabel = $derived(currentActive?.name || 'No preset');

	function handleSelect(id: string | null): void {
		presetsStore.setActivePreset(id);
		if (id) {
			const p = presetsStore.getPreset(id);
			toast.success(`Preset "${p?.name}" activated`);
		} else {
			toast.info('Preset cleared');
		}
	}

	function handleDelete(id: string): void {
		const p = presetsStore.getPreset(id);
		if (p && presetsStore.deletePreset(id)) {
			toast.success(`Preset "${p.name}" deleted`);
		}
	}

	function handleDuplicate(id: string): void {
		const newId = presetsStore.duplicatePreset(id);
		if (newId) {
			const p = presetsStore.getPreset(newId);
			toast.success(`Preset "${p?.name}" created`);
		}
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		class="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground {className}"
		{disabled}
		title={activeLabel}
	>
		<WandSparkles class="h-3.5 w-3.5" />
		<span class="max-w-[8rem] truncate">{activeLabel}</span>
		<ChevronDown class="h-3 w-3 opacity-50" />
	</DropdownMenu.Trigger>

	<DropdownMenu.Content
		side="top"
		align="start"
		sideOffset={8}
		class="max-h-80 w-64 overflow-y-auto"
	>
		<DropdownMenu.Label class="px-3 py-1.5 text-xs font-medium text-muted-foreground">
			Active Preset
		</DropdownMenu.Label>

		<DropdownMenu.Separator />

		<DropdownMenu.Item class="cursor-pointer" onclick={() => handleSelect(null)}>
			<span class="text-muted-foreground italic">None (global settings)</span>
		</DropdownMenu.Item>

		{#if currentPresets.length > 0}
			<DropdownMenu.Separator />
			<DropdownMenu.Label class="px-3 py-1.5 text-xs font-medium text-muted-foreground">
				Presets
			</DropdownMenu.Label>

			{#each currentPresets as preset (preset.id)}
				<DropdownMenu.Sub>
					<DropdownMenu.SubTrigger
						class="cursor-pointer justify-between"
						onclick={() => handleSelect(preset.id)}
					>
						<span class="flex items-center gap-2">
							{#if currentActive?.id === preset.id}
								<WandSparkles class="h-3.5 w-3.5 text-primary" />
							{/if}
							<span class="truncate">{preset.name}</span>
						</span>
						<ChevronDown class="h-3 w-3 rotate-90 opacity-50" />
					</DropdownMenu.SubTrigger>

					<DropdownMenu.SubContent class="w-48">
						<DropdownMenu.Item class="cursor-pointer" onclick={() => handleSelect(preset.id)}>
							<WandSparkles class="mr-2 h-3.5 w-3.5" />
							{#if currentActive?.id === preset.id}
								Active
							{:else}
								Activate
							{/if}
						</DropdownMenu.Item>

						<DropdownMenu.Separator />

						<DropdownMenu.Item class="cursor-pointer" onclick={() => handleDuplicate(preset.id)}>
							<Copy class="mr-2 h-3.5 w-3.5" />
							Duplicate
						</DropdownMenu.Item>

						<DropdownMenu.Item
							class="cursor-pointer text-destructive focus:text-destructive"
							onclick={() => handleDelete(preset.id)}
						>
							<Trash2 class="mr-2 h-3.5 w-3.5" />
							Delete
						</DropdownMenu.Item>
					</DropdownMenu.SubContent>
				</DropdownMenu.Sub>
			{/each}
		{:else}
			<div class="px-3 py-4 text-center text-xs text-muted-foreground">No presets yet</div>
		{/if}

		<DropdownMenu.Separator />

		<DropdownMenu.Item class="cursor-pointer" onclick={() => (managerOpen = true)}>
			<Settings2 class="mr-2 h-3.5 w-3.5" />
			Manage presets
		</DropdownMenu.Item>

		<DropdownMenu.Item class="cursor-pointer" onclick={() => (managerOpen = true)}>
			<Plus class="mr-2 h-3.5 w-3.5" />
			New preset
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>

<PresetsManager bind:open={managerOpen} />
