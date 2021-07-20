type Timer = {
	name: string
	length: number
	currentTime: number
	active: number
}

type State = {
	timers: {
		[key: string]: Timer
	}
	ids: {
		[key: string]: number
	}
}
