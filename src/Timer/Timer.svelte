<script lang="ts">
	import Button from './ControlButton.svelte'
	import Clock from './Clock.svelte'
	import Editable from '../Editable.svelte'

	import { controlTimer, decrementTimer, editTimerTitle, state } from '../State/StateStore';
	import { onMount } from 'svelte';

	export let id: string

	export let name: string
	export let active: number
	export let currentTime: number

	const clock = setInterval(() => {
		if (active > 0)
		state.update(state => decrementTimer(state, id))
	}, 1000)

	onMount(() => () => clearInterval(clock))
</script>

<div>
	<Clock {active} {currentTime} />

	<Editable on:edit={(e) => {
		state.update(state => editTimerTitle(state, id, e.detail))
	}} disabled={active > 0} style="max-width: 70%;">
		{name}
	</Editable>

	<Button {active} on:click={(e) => {
		state.update(state => controlTimer(
			state, id,
			e.detail.active
		))
	}} />
</div>

<style>
	div {
		display: flex;

		align-items: center;
		flex-direction: column;

		height: 230px;
		width: 260px;

		background-color: var(--card-background);
		border-radius: 20px;
		box-shadow: 0px 6px 17px -2px rgba(0, 0, 0, 0.637);

		transition: 0.2s ease-in-out all;
	}

	div:hover {
		box-shadow: 0px 14px 20px -2px rgba(0, 0, 0, 0.447);
		transform: scale(1.01);
	}
</style>
