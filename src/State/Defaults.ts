const ids: {
	[key: string]: number
} = {}

export function generateID(prefix: string) {
	if (!Object.keys(ids).includes(prefix)) {
		ids[prefix] = 0
	}

	ids[prefix]++
	return `${prefix}_${ids[prefix]}`
}

export function defaultState(): State {
	return {
		timers: {}
	}
}

export function defaultTimer(n: number): Timer {
	return {
		name: `Timer ${n}`,
		length: 60,
		currentTime: 60,
		active: -1
	}
}
