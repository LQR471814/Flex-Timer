import { writable } from "svelte/store"
import { defaultState, defaultTimer, generateID } from './Defaults'

const storedTheme = localStorage.getItem('state')
export const state = writable<State>(
	storedTheme ?
		JSON.parse(storedTheme) :
		defaultState()
)
state.subscribe(val => {
	localStorage.setItem('state', JSON.stringify(val))
})

let defaultTimerNumber = 0

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