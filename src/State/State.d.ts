type Timer = {
	name: string
	length: number
	currentTime: Time
	active: number
}

type State = {
	timers: {
		[key: string]: Timer
	}
}
