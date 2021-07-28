<script lang="ts">
	import PlusButton from './PlusButton.svelte';
	import Timer from '../Timer/Timer.svelte'
	import Close from './Close.svelte'
	import { fly } from 'svelte/transition'

	import { addDefaultTimer, state } from '../State/StateStore'
	import ConfigButton from './ConfigButton.svelte';

	let timers
	state.subscribe(val => {
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

		<ConfigButton />
	</div>
</main>

<style>
	:global(:root) {
		--background: #9e9e9e;
		--card-background: #cfcfcf;
		--config-color: #dddddd;
		--play-button-background: #fff;

		--button-subtle-background: rgba(255, 255, 255, 0.096);
		--button-hover-background: rgba(255, 255, 255, 0.158);
		--button-active-background: rgba(255, 255, 255, 0.247);

		--button-normal-border: 1px solid transparent;
		--button-active-border: 1px solid rgba(255, 255, 255, 0.637);

		--accent: #181818;
	}

	:global(.svg-fill-transparent) {
		fill: transparent;
	}

	:global(.svg-fill-play-btn-background) {
		fill: var(--play-button-background)
	}

	:global(.svg-fill-accent) {
		fill: var(--accent)
	}

	:global(span) {
		color: rgb(24, 24, 24);
		font-family: 'Verdana', sans-serif;

		font-size: 20px;

		outline: none;
		-webkit-user-select: none;
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