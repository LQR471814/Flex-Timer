<script lang="ts">
	import Menu from '../Common/Menu.svelte';
	import Gear from '../Svg/Gear.svelte';

	import Import from '../Svg/Import.svelte'
	import Export from '../Svg/Export.svelte'

	let showMenu = -1
	let currentTimeout
</script>

<div class="config-root">
	{#if showMenu > 0}
		<Menu items={[
			{
				icon: Import,
				text: 'Import config',
				callback: () => {

				}
			},
			{
				icon: Export,
				text: 'Export config',
				callback: () => {
				}
			}
		]} />
	{/if}

	<div
		class="config-button"
		on:click={() => {
			showMenu *= -1

			if (showMenu > 0) {
				if (currentTimeout)
					clearTimeout(currentTimeout)

				currentTimeout = setTimeout(() => {
					if (showMenu > 0)
					showMenu = -1
				}, 6000)
			}

		}}
	>
		<Gear />
	</div>

	<input type="file">
</div>

<style>
	input {
		display: none
	}

	.config-root {
		display: flex;
		align-items: center;
		position: fixed;

		margin-bottom: 20px;

		right: 0;
		bottom: 0;
	}

	.config-button {
		margin: 40px;
		margin-left: 15px;

		padding: 12px;

		height: 40px;
		width: 40px;

		border-radius: 50%;
		border: 1px solid transparent;

		transition: 0.15s ease-out all;
	}

	.config-button:hover {
		background-color: var(--button-hover-background);
		cursor: pointer;
	}

	.config-button:active {
		background-color: var(--button-active-background);
		border: var(--button-active-border);
	}
</style>
