<script lang="ts">
	export let currentTime: number

	const digitCount = 2

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
