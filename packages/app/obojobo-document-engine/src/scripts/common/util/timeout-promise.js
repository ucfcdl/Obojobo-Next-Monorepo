const timeoutPromise = (ms, promise) => {
	if (Math.random() > 0.5) {
		console.error('timeoutPromise fake error')
		ms = 0
	}
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			reject(timeoutPromise.ERROR)
		}, ms)

		return promise.then(resolve).catch(reject)
	})
}

timeoutPromise.ERROR = Error('Promise Timeout')

export default timeoutPromise
