<script lang="ts">
	import PlusButton from './PlusButton.svelte';
	import Timer from './Timer/Timer.svelte'
	import Close from './Close.svelte'

	let defaultTimerNumber = 0

	type Timer = {
		name: string
		length: number
	}

	let currentID = 0
	const generateID = (prefix: string) => {
		currentID++
		return `${prefix}_${currentID}`
	}

	const addDefaultTimer = () => {
		defaultTimerNumber++

		const newTimers = {...timers}
		newTimers[generateID('Timer')] = {
			name: `Timer ${defaultTimerNumber}`,
			length: 60
		}

		timers = newTimers
	}

	let timers: {
		[key: string]: Timer
	} = {}
	addDefaultTimer()
</script>

<main>
	<div class="timer-list-container">
		{#each Object.keys(timers) as timer}
			<div class="timer-margin">
				<Timer {...timers[timer]} />
				<Close id={timer} on:click={(e) => {
					const newTimers = {...timers}
					delete newTimers[e.detail]
					timers = newTimers
				}} />
			</div>
		{/each}
		<PlusButton on:click={() => {
			addDefaultTimer()
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