<script lang="ts">
	import PlusButton from './PlusButton.svelte';
	import Timer from './Timer/Timer.svelte'
	import Close from './Close.svelte'
	import { fly } from 'svelte/transition'

	import {addDefaultTimer, state} from './State/StateStore'

	state.update(addDefaultTimer)

	let timers
	state.subscribe(val => {
		console.log(val)
		timers = val.timers
	})
</script>

<main>
	<div class="timer-list-container">
		{#each Object.keys(timers) as timer}
			<div class="timer-margin" transition:fly={{x: -100, y: 0}}>
				<Timer
					id={timer}
					name={timers[timer].name}
					active={timers[timer].active}
					currentTime={timers[timer].currentTime}
				/>
				<Close id={timer} />
			</div>
		{/each}
		<PlusButton on:click={() => {
			state.update(addDefaultTimer)
		}} />
	</div>
</main>

<style>
	:global(:root) {
		--background: #9e9e9e;
		--card-background: #cfcfcf;
		--button-background: #fff;

		--accent: #181818;
	}

	:global(.svg-fill-transparent) {
		fill: transparent;
	}

	:global(.svg-fill-btn-background) {
		fill: var(--button-background)
	}

	:global(.svg-fill-accent) {
		fill: var(--accent)
	}

	main {
		min-height: 100vh;
		background-color: var(--background);

		padding: 30px;
		box-sizing: border-box;
	}

	.timer-list-container {
		display: flex;
		flex-wrap: wrap;
	}

	.timer-margin {
		margin: 10px;

		/* To make position absolute in child work properly */
		position: relative;
	}
</style>