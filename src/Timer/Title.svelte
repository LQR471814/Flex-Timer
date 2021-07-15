<script lang='ts'>
	import { createEventDispatcher } from 'svelte'

	const dispatch = createEventDispatcher()
</script>

<span
	contenteditable="true"
	on:input={(e) => {
		//@ts-ignore
		dispatch('edit', e.target.innerText)
	}}>
	<slot></slot>
</span>

<style>
	span {
		display: block;

		color: rgb(24, 24, 24);
		font-family: 'Verdana', sans-serif;

		font-size: 20px;

		outline: none;
		-webkit-user-select: none;
	}
</style>