<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Plus from './svgs/Plus.svelte';

	const dispatch = createEventDispatcher()
</script>

<div class="plus-root">
	<div class="plus-container" on:click={() => {
		dispatch('click')
	}}><Plus /></div>
</div>

<style>
	.plus-root {
		display: flex;

		align-items: center;
		justify-content: center;

		padding-bottom: 10px;
		padding-left: 10px;
	}

	.plus-container {
		width: 100px;
		height: 100px;

		border: 1px solid transparent;
		border-radius: 50%;

		transition: 0.15s ease-out all;
	}

	.plus-container:hover {
		background-color: var(--button-hover-background);
		cursor: pointer;
	}
	.plus-container:active {
		background-color: var(--button-active-background);
		border: var(--button-active-border);
	}
</style>
