<script lang="ts">
	import { createEventDispatcher, onMount } from "svelte";

	const digitCount = 2
	const defaultTime = 5 //? In seconds

	export let length = defaultTime
	let currentTime = defaultTime
	$: { currentTime = length }

	export let active = -1


	const dispatch = createEventDispatcher()

	const timeToString = (time: number) => {
		const hours = Math.floor(time / 60**2)
		const hourRemainder = time % 60**2

		const minutes = Math.floor(hourRemainder / 60)
		const minuteRemainder = hourRemainder % 60

		const seconds = Math.floor(minuteRemainder)
		return `${fitDigit(hours, digitCount)}:${fitDigit(minutes, digitCount)}:${fitDigit(seconds, digitCount)}` //? Format HH:MM:SS
	}

	const fitDigit = (n: number, digits: number) => {
		let result = n.toString()
		if (result.length > digits) {
			console.error('Number has more digits than target digit amount')
			return
		}

		for (let i = 0; i < digits - result.length; i++) {
			result = "0" + result
		}

		return result
	}

	const clock = setInterval(() => {
		if (active > 0 && currentTime > 0) currentTime -= 1
		if (currentTime === 0) {
			currentTime = length
			dispatch('finish')
		}
	}, 1000)

	onMount(() => () => clearInterval(clock))
</script>

<span>{timeToString(currentTime)}</span>

<style>
	span {
		display: block;

		color: rgb(24, 24, 24);
		font-family: 'Verdana', sans-serif;

		padding-top: 25px;
		padding-bottom: 10px;

		font-size: 35px;

		-webkit-user-select: none;
	}
</style>
