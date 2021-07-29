import { writable } from "svelte/store"
import { defaultState, defaultTimer, generateID } from './Defaults'

const storedTheme = localStorage.getItem('state')

export const state = writable<State>(
	storedTheme ?
		JSON.parse(storedTheme) :
		defaultState()
)

let defaultTimerNumber = 0
let currentStateAsJSON

state.subscribe(val => {
	currentStateAsJSON = toJSON(val)
	localStorage.setItem('state', currentStateAsJSON)
})

function toJSON(val: State) {
	return JSON.stringify({
		...val,
		type: "state"
	})
}

export function exportState() {
	return new Blob(
		[currentStateAsJSON],
		{ type: 'text/json' }
	)
}

export function refreshTimers(val: State) {
	const newState = { ...val }

	for (const timer of Object.values(newState.timers)) {
		timer.currentTime = timer.length
		timer.active = -1
	}

	return newState
}

export function addDefaultTimer(val: State) {
	defaultTimerNumber++

	const newState = { ...val }
	newState.timers[
		generateID(val, 'Timer')
	] = defaultTimer(defaultTimerNumber)

	return newState
}

export function editTimerLength(val: State, timerID: string, length: number) {
	const newState = { ...val }
	const timer = newState.timers[timerID]

	if (timer.currentTime === timer.length)
		timer.currentTime = length

	timer.length = length
	return newState
}

export function editTimerTitle(val: State, timerID: string, title: string) {
	const newState = { ...val }
	newState.timers[timerID].name = title
	return newState
}

export function removeTimer(val: State, timerID: string) {
	const newState = { ...val }
	delete newState.timers[timerID]
	return newState
}

export function decrementTimer(val: State, timerID: string) {
	const newState = { ...val }
	const timer = newState.timers[timerID]

	if (timer.currentTime === 0) {
		new Notification(timer.name, { body: "Done!" })

		timer.active = -1
		timer.currentTime = timer.length
		return newState
	}

	timer.currentTime--
	return newState
}

export function controlTimer(val: State, timerID: string, active: number) {
	const newState = { ...val }
	const timer = newState.timers[timerID]

	timer.active = active

	return newState
}