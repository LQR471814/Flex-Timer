<script lang="ts">
	import PlayButton from '../Svg/PlayButton.svelte'
	import { createEventDispatcher } from "svelte";

	export let active = -1

	const dispatch = createEventDispatcher();
</script>

<div class="timer-control-container">
	<div on:click={() => {
		active *= -1
		dispatch('click', { active: active })
	}}>
		<PlayButton active={active > 0 ? true : false}></PlayButton>
	</div>
</div>

<style>
	div {
		width: 60px;
		height: 60px;
	}

	.timer-control-container {
		display: flex;
		height: 100%;

		justify-content: center;
		align-items: center;
	}
</style>
