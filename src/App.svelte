<script lang="ts">
	import PlusButton from './PlusButton.svelte';
	import Timer from './Timer/Timer.svelte'

	let defaultTimerNumber = 0

	type Timer = {
		name: string
		length: number
	}

	const addDefaultTimer = () => {
		defaultTimerNumber++
		timers = [...timers, {
			name: `Timer ${defaultTimerNumber}`,
			length: 60
		}]
	}

	let timers: Timer[] = []
	addDefaultTimer()
</script>

<main>
	<div class="timer-list-container">
		{#each timers as timer}
			<div class="timer-margin">
				<Timer {...timer} />
			</div>
		{/each}
		<PlusButton on:click={() => {
			addDefaultTimer()
		}} />
	</div>
</main>

<style>
	:root {
		/* --background: #A98467; */
		--background: #9e9e9e;
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
	}
</style>