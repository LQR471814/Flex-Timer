<script lang="ts">
	import type { SvelteComponent } from "svelte/internal";
	import { fly } from 'svelte/transition'

	type Item = {
		icon?: SvelteComponent
		text: string
		callback: () => void
	}

	export let items: Item[] = []
</script>

<div class="menu-root" transition:fly={{y: 30}}>
	{#each items as item}
		<div class="menu-item">
			<div class="item-svg">
				<svelte:component this={item.icon} />
			</div>

			<span>{item.text}</span>
		</div>
	{/each}
</div>

<style>
	span {
		color: var(--config-color);
	}

	.menu-root {
		border-radius: 10px;
		backdrop-filter: blur(10px);
	}

	.item-svg {
		height: 22px;
		width: 22px;

		margin-right: 10px;
	}

	.menu-item {
		display: flex;

		padding: 10px;
		margin: 12px;

		background-color: var(--button-subtle-background);
		border-radius: 10px;
		border: var(--button-normal-border);

		align-items: center;
		transition: 0.15s ease-out all;
	}

	.menu-item:hover {
		cursor: pointer;
		background-color: var(--button-hover-background);
	}

	.menu-item:active {
		border: var(--button-active-border)
	}
</style>