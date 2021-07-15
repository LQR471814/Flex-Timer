import { writable } from "svelte/store"
import { defaultState, defaultTimer, generateID } from './Defaults'

export const state = writable<State>(defaultState())
let defaultTimerNumber = 0

export function addDefaultTimer(state: State) {
	defaultTimerNumber++

	const newState = { ...state }

	newState.timers[
		generateID('Timer')
	] = defaultTimer(defaultTimerNumber)

	return newState
}

export function removeTimer(state: State, timerID: string) {
	const newState = {...state}
	delete newState.timers[timerID]
	return newState
}

export function decrementTimer(state: State, timerID: string) {
	const newState = {...state}
	const timer = newState.timers[timerID]

	timer.currentTime--
	if (timer.currentTime === 0) {
		timer.active = -1
		timer.currentTime = timer.length
	}

	return newState
}

export function controlTimer(state: State, timerID: string, active: number) {
	const newState = {...state}
	const timer = newState.timers[timerID]

	timer.active = active

	return newState
}