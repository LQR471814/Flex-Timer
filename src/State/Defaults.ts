function setID(val: State, prefix: string, value?: number) {
	const newState = { ...val }

	if (value) {
		newState.ids[prefix] = value
		return newState
	}

	if (!Object.keys(newState.ids).includes(prefix))
	newState.ids[prefix] = 0

	newState.ids[prefix]++
	return newState
}

export function generateID(val: State, prefix: string) {
	setID(val, prefix)
	return `${prefix}_${val.ids[prefix]}`
}

export function defaultState(): State {
	return {
		timers: {},
		ids: {}
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
