<script lang="ts">
	export let active = false
	export let style = ""
</script>

{#if active === true}

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" {style}>
	<path class="svg-fill-btn-background" d="M540,1030A490.14,490.14,0,0,1,349.29,88.49a490.13,490.13,0,0,1,381.42,903A486.8,486.8,0,0,1,540,1030Z"/>
	<path class="svg-fill-accent" d="M540,100A440.14,440.14,0,0,1,711.24,945.46,440.14,440.14,0,0,1,368.76,134.54,437.12,437.12,0,0,1,540,100M540,0C241.77,0,0,241.77,0,540s241.77,540,540,540,540-241.77,540-540S838.23,0,540,0Z"/>
	<path class="svg-fill-btn-background" d="M419.72,760.19A16.44,16.44,0,0,1,403.5,744V362.72a16.22,16.22,0,1,1,32.43,0V744A16.43,16.43,0,0,1,419.72,760.19Z"/>
	<path class="svg-fill-accent" d="M419.72,309A53.87,53.87,0,0,0,366,362.72V744a53.72,53.72,0,1,0,107.43,0V362.72A53.87,53.87,0,0,0,419.72,309Z"/>
	<path class="svg-fill-btn-background" d="M660.79,761.5a16.44,16.44,0,0,1-16.22-16.22V364A16.22,16.22,0,1,1,677,364V745.28A16.43,16.43,0,0,1,660.79,761.5Z"/>
	<path class="svg-fill-accent" d="M660.79,310.31A53.87,53.87,0,0,0,607.07,364V745.28a53.72,53.72,0,1,0,107.43,0V364a53.87,53.87,0,0,0-53.71-53.72Z"/>
</svg>

{:else}

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" {style}>
	<path class="svg-fill-accent" d="M540,1030A490.14,490.14,0,0,1,349.29,88.49a490.13,490.13,0,0,1,381.42,903A486.8,486.8,0,0,1,540,1030Z"/>
	<path class="svg-fill-accent" d="M540,100A440.14,440.14,0,0,1,711.24,945.46,440.14,440.14,0,0,1,368.76,134.54,437.12,437.12,0,0,1,540,100M540,0C241.77,0,0,241.77,0,540s241.77,540,540,540,540-241.77,540-540S838.23,0,540,0Z"/>
	<path class="svg-fill-btn-background play-button-stroke" d="M761.74,537.29l-322.24-186a3.33,3.33,0,0,0-5,2.88v372.1a3.33,3.33,0,0,0,5,2.88l322.24-186A3.34,3.34,0,0,0,761.74,537.29Z"/>
</svg>

{/if}

<style>
	svg {
		width: 100%;
		height: 100%;

		transition: 0.2s ease-in-out all;
	}

	svg:hover {
		transform: scale(1.07);
	}

	.play-button-stroke {
		stroke: var(--button-background);
		stroke-miterlimit: 10;
		stroke-width: 50px;
	}
</style>
