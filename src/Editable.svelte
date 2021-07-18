<script lang='ts'>
	import { createEventDispatcher } from 'svelte'

	const dispatch = createEventDispatcher()
	export let style = ""
	export let disabled = false
</script>

<span
	{style}
	contenteditable={disabled ? false : true}
	on:input={(e) => {
		//@ts-ignore
		dispatch('edit', e.target.innerText)
	}}>
	<slot></slot>
</span>

<style>
	span {
		color: rgb(24, 24, 24);
		font-family: 'Verdana', sans-serif;

		font-size: 20px;

		outline: none;
		-webkit-user-select: none;
	}
</style>