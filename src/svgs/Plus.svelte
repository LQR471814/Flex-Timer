<script lang='ts'>
	export let style = ""
</script>

<svg {style} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
	<rect class="plus-symbol" x="45" y="15" width="11" height="67" rx="5.5" transform="translate(2 99) rotate(-90)" />
	<rect class="plus-symbol" x="45" y="15" width="11" height="67" rx="5.5" />
</svg>

<style>
	svg {
		width: 100%;
		height: 100%;
	}

	.plus-symbol { fill: var(--card-background) }
</style>
