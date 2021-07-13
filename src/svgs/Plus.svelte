<svg
	id="Layer_1"
	data-name="Layer 1"
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 100 100"
>
	<circle class="plus-background" cx="50" cy="50" r="50" />
	<rect class="plus-symbol" x="45" y="15" width="11" height="67" rx="5.5" transform="translate(2 99) rotate(-90)" />
	<rect class="plus-symbol" x="45" y="15" width="11" height="67" rx="5.5" />
</svg>

<style>
	svg {
		--background: transparent;

		height: 100px;
		width: 100px;
	}

	svg:hover {
		--background: #ffffff15;
		cursor: pointer;
	}

	svg:active {
		--background: rgba(255, 255, 255, 0.144);
	}

	.plus-background {
		fill: var(--background);
		transition: 0.12s ease-in-out all;
	}

	.plus-symbol { fill: #c4c4c4 }
</style>
