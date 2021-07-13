<script lang="ts">
	import Timer from './Timer/Timer.svelte'
</script>

<main>
	<Timer name="Test Timer" />
</main>

<style>
	:root {
		/* --background: #A98467; */
		--background: #9e9e9e;
	}

	main {
		height: 100%;
		background-color: var(--background);

		padding: 30px;
		box-sizing: border-box;
	}
</style>