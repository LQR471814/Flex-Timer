<script lang='ts'>
	import { afterUpdate, createEventDispatcher } from 'svelte'

	const dispatch = createEventDispatcher()

	const onedit = () => {
		const previousText = text
		let currentText = span.innerText

		if (beforeEdit(currentText)) {
			dispatch('edit', currentText)

			span.innerText = currentText //? Force update
			return
		}

		span.innerText = previousText
	}

	afterUpdate(() => {
		//? I have to use innerText to set values since
		//? contenteditable will override svelte's render
		span.innerText = text
	})

	export let text
	export let style = ""

	export let disabled = false
	export let beforeEdit: (
		currentText: string
	) => boolean = () => true

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
