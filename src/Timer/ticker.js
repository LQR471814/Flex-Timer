let clock
let active

onmessage = (e) => {
	const msg = e.data

	switch (msg.type) {
		case "start":
			clock = setInterval(() => {
				if (active) {
					postMessage({
						type: "update"
					})
				}
			}, 1000)
			break
		case "active":
			active = msg.active
			break
		case "stop":
			clearInterval(clock)
			close()
			break
	}
}