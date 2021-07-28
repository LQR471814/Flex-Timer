import { isNumber } from '../utils'

export function numberOnly(currentText: string) {
	if (isNumber(currentText)) return true
}
