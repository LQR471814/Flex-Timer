<script lang='ts'>
	import { afterUpdate, createEventDispatcher } from 'svelte'

	const dispatch = createEventDispatcher()

	const numberRe = new RegExp('^[0-9]+$')
	const isNumber = (n: string) => {
		return numberRe.test(n)
	}

	const onedit = () => {
		const previousText = text
		let eventText = span.innerText

		if (eventText.length > max || eventText.length <= min) {
			span.innerText = previousText
			return
		}

		if (number === false) {
			dispatch('edit', eventText)
			return
		}

		if (isNumber(eventText)) {
			dispatch('edit', parseInt(eventText))
			text = eventText //? Forces svelte to rerender even if the number is the same
			return
		}

		span.innerText = previousText
	}

	export let text

	afterUpdate(() => {
		console.log(text)
		//? I have to use innerText to set values since
		//? contenteditable will override svelte's render
		span.innerText = text
	})

	export let style = ""
	export let min = 0
	export let max = Infinity
	export let disabled = false
	export let number = false

	let span: HTMLSpanElement
</script>

<span
	{style}
	contenteditable={disabled ? false : true}
	bind:this={span}
	on:blur={onedit}
	on:keydown={(e) => {
		if (e.code === "Enter") {
			e.preventDefault()
			span.blur()
			onedit()
		}
	}}
/>

<style>
	span {
		color: rgb(24, 24, 24);
		font-family: 'Verdana', sans-serif;

		font-size: 20px;

		outline: none;
		-webkit-user-select: none;
	}
</style>