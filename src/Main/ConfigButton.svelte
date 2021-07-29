<script lang="ts">
	import { getContext } from 'svelte';
	import { exportState, refreshTimers, state } from '../State/StateStore';
	import { defaultState } from '../State/Defaults';

	import Menu from '../Common/Menu.svelte';
	import Gear from '../Svg/Gear.svelte';

	import Import from '../Svg/Import.svelte'
	import Export from '../Svg/Export.svelte'
	import TrashCan from '../Svg/TrashCan.svelte';
	import Refresh from '../Svg/Refresh.svelte';

	let showMenu = -1
	let currentTimeout

	const { upload, download } = getContext('FileActions')
</script>

<div class="config-root">
	{#if showMenu > 0}
		<Menu items={[
			{
				icon: Import,
				text: 'Import config',
				callback: () => upload()
					.then(val => val.text()
						.then(val => {
							const applyState = JSON.parse(val)
							if (applyState['type'] === 'state') {
								delete applyState['type']
								state.set(applyState)
							}
						})
					)
			},
			{
				icon: Export,
				text: 'Export config',
				callback: () => download(
					exportState(),
					"config.json",
				)
			},
			{
				icon: TrashCan,
				text: 'Clear config',
				callback: () => {
					state.set(defaultState())
				}
			}
		]} />
	{/if}

	<div class="config-btns-container">
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
			<Gear fill="var(--card-background)" />
		</div>

		<div
			class="config-button refresh-button"
			on:click={() => {
				state.update(refreshTimers)
			}}
		>
			<Refresh fill="var(--card-background)" />
		</div>
	</div>
</div>

<style>
	.config-root {
		display: flex;
		align-items: center;
		position: fixed;

		margin-bottom: 20px;

		right: 0;
		bottom: 0;
	}

	.config-btns-container {
		display: flex;
		flex-direction: column;

		align-items: center;

		margin: 40px;
		margin-left: 15px;
	}

	.config-button {
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

	.refresh-button {
		height: 20px;
		width: 20px;

		margin-top: 8px;
	}
</style>
