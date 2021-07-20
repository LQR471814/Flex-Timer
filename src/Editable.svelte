<script lang='ts'>
	import { afterUpdate, createEventDispatcher } from 'svelte'

	const dispatch = createEventDispatcher()

	const numberRe = new RegExp('^[0-9]+$')
	const isNumber = (n: string) => {
		return numberRe.test(n)
	}

	const onedit = () => {
		const previousText = text
		let currentText = span.innerText

		if (number === false) {
			dispatch('edit', currentText)
			return
		}

		if (isNumber(currentText)) {
			dispatch('edit', parseInt(currentText))
			text = currentText //? Forces svelte to rerender even if the number is the same
			return
		}

		span.innerText = previousText
	}

	export let text

	afterUpdate(() => {
		//? I have to use innerText to set values since
		//? contenteditable will override svelte's render
		span.innerText = text
	})

	export let style = ""
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
