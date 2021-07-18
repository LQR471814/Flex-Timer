<script lang="ts">
	import Editable from '../Editable.svelte'

	/* State & Props */
	export let currentTime: number
	export let active: number

	let lengthEditDisabled = true
	let renderedTime: string[] = []

	$: {
		lengthEditDisabled = active > 0
		renderedTime = secondsToTime(
			currentTime
		).map(val => fitDigit(val, digitCount))
	}

	/* Data Handling */
	const digitCount = 2
	const editableStyle = "font-size: 35px;"

	const second = 1
	const minute = 60 * second
	const hour = 60 * minute

	const secondsToTime = (time: number) => {
		const hours = Math.floor(time / 60 ** 2)
		const hourRemainder = time % 60 ** 2

		const minutes = Math.floor(hourRemainder / 60)
		const minuteRemainder = hourRemainder % 60

		const seconds = Math.floor(minuteRemainder)

		return [hours, minutes, seconds]
	}

	const timeToSeconds = (
		hours: number,
		minutes: number,
		seconds: number
	) => {
		return hours * hour +
			minutes * minute +
			seconds * second
	}

	const fitDigit = (n: number, digits: number) => {
		let result = n.toString()
		if (result.length > digits) {
			throw new Error('Number has more digits than target digit amount')
		}

		for (let i = 0; i < digits - result.length; i++) {
			result = "0" + result
		}

		return result
	}

	/* Utility */
	const join = (arr: any[], seperator: any) => {
		const result = []
		for (const element of arr) {
			result.push(element)
			if (result.length <= arr.length) result.push(seperator)
		}
		return result
	}
</script>

<div>
	{#each join(renderedTime, 'SEPERATOR') as element}
		{#if element === 'SEPERATOR'}
			<span>:</span>
		{:else}
			<Editable
				disabled={lengthEditDisabled}
				style={editableStyle}
			>{element}</Editable>
		{/if}
	{/each}
</div>

<style>
	div {
		padding-top: 25px;
		padding-bottom: 10px;
	}

	span {
		color: rgb(24, 24, 24);
		font-family: 'Verdana', sans-serif;

		font-size: 35px;

		-webkit-user-select: none;
	}
</style>
