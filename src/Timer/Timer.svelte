<script lang="ts">
	import Button from './Button.svelte'
	import Clock from './Clock.svelte'
	import Title from './Title.svelte'

	export let name: string
	let active = -1
</script>

<div>
	<Clock
		{active}
		on:finish={() => {
			active = -1
		}}
	/>
	<Title>{name}</Title>
	<Button {active} on:click={(e) => {
		active = e.detail.active
	}} />
</div>

<style>
	div {
		display: flex;

		align-items: center;
		flex-direction: column;

		height: 230px;
		width: 270px;

		/* background-color: #ADC178; */
		background-color: #cfcfcf;
		border-radius: 20px;
		box-shadow: 0px 6px 17px -2px rgba(0, 0, 0, 0.637);

		transition: 0.2s ease-in-out all;
	}

	div:hover {
		box-shadow: 0px 14px 20px -2px rgba(0, 0, 0, 0.447);
		transform: scale(1.01);
	}
</style>