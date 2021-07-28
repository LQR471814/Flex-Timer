const numberRe = new RegExp('^[0-9]+$')
export const isNumber = (n: string) => {
	return numberRe.test(n)
}
