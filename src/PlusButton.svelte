<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Plus from './svgs/Plus.svelte';

	const dispatch = createEventDispatcher()
</script>

<div class="plus-button-container">
	<div on:click={() => {
		dispatch('click')
	}}><Plus /></div>
</div>

<style>
	.plus-button-container {
		display: flex;

		align-items: center;
		justify-content: center;

		padding-bottom: 10px;
		padding-left: 10px;
	}
</style>
