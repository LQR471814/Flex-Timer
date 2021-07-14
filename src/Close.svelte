<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Trash from './svgs/TrashCan.svelte'

	const dispatch = createEventDispatcher()

	export let id: string = ""
</script>

<div
	on:click={() => dispatch('click', id)}
	class="close-root"
>
	<Trash />
</div>

<style>
	.close-root {
		position: absolute;
		padding: 9px;

		width: 27px;
		height: 27px;

		right: 15px;
		bottom: 12px;

		border: 1px solid transparent;

		border-radius: 50%;
		transition: 0.1s ease-in-out all;
	}

	.close-root:hover {
		background-color: rgba(255, 162, 162, 0.199);
		cursor: pointer;

		transform: scale(1.04);
	}

	.close-root:active {
		background-color: rgba(255, 162, 162, 0.300);
		border: 1px solid rgba(255, 144, 144, 0.733);
	}
</style>