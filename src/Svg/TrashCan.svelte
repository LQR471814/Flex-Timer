<script lang='ts'>
	export let fill = "var(--accent)"
</script>

<svg style="--fill: {fill}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 271 303">
	<g id="Body">
		<path class="svg-fill-transparent" d="M68,293c-3.86,0-6.25-1.44-6.82-2.07L12.55,99.6A11,11,0,0,1,19,97.85H252.31a11,11,0,0,1,6.46,1.75L210.2,290.93c-.58.63-3,2.07-6.83,2.07Z" transform="translate(0 0)"/>
		<path class="trash-can-fill" d="M246.36,107.85,201.89,283H69.51L25,107.85H246.36M17.92,108h0M252.31,87.85H19C8.68,87.85.83,94.1,2.57,100.94l49,192.74C53,299.06,59.91,303,68,303H203.37c8.13,0,15.08-3.94,16.44-9.32l48.94-192.74c1.74-6.84-6.11-13.09-16.44-13.09Z" transform="translate(0 0)"/>
	</g>
	<g id="Lines">
		<line class="trash-stroke" x1="193.22" y1="146.91" x2="177.56" y2="246.5"/>
		<line class="trash-stroke" x1="136.5" y1="147.2" x2="136.35" y2="246.81"/>
		<line class="trash-stroke" x1="78.77" y1="147.62" x2="94.35" y2="247.07"/>
	</g>
	<g id="Lid">
		<path class="trash-stroke" d="M34,44H237a24,24,0,0,1,24,24V82a6,6,0,0,1-6,6H16a6,6,0,0,1-6-6V68A24,24,0,0,1,34,44Z"/>
		<rect class="trash-stroke" x="100" y="10" width="72" height="34" rx="12"/>
	</g>
</svg>

<style>
	svg {
		width: 100%;
		height: 100%;
	}

	.trash-can-fill {
		fill: var(--fill);
	}

	.trash-stroke {
		fill: none;

		stroke-width: 20px;
		stroke: var(--fill);
		stroke-linecap: round;
		stroke-linejoin: round;
	}
</style>
