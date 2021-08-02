<script lang="ts">
	import Button from './ControlButton.svelte'
	import Clock from './Clock.svelte'
	import Editable from '../Common/Editable/Editable.svelte'

	import TickerWorker from 'web-worker:./ticker'
	import { controlTimer, decrementTimer, editTimerLength, editTimerTitle, state } from '../State/StateStore';
	import { onMount } from 'svelte';

	const ticker = new TickerWorker()

	ticker.addEventListener("message", (e) => {
		const msg = e.data

		if (msg.type === "update") {
			state.update(state => decrementTimer(state, id))
		}
	})

	export let id: string
	export let name: string
	export let currentTime: number

	export let active: number
	$: {
		ticker.postMessage({ type: "active", active: active > 0 })
	}

	onMount(() => {
		ticker.postMessage({ type: "start" })
		return () => ticker.postMessage({ type: "stop" })
	})
</script>

<div>
	<Clock {active} {currentTime} on:edit={(e) => {
		state.update(state => editTimerLength(state, id, e.detail))
	}} />

	<Editable
		text={name}
		on:edit={(e) => {
			state.update(state => editTimerTitle(state, id, e.detail))
		}}
		disabled={active > 0}
		style="max-width: 70%;"
	/>

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
