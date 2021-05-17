// NOTE: these are all 2 lines
// because mockReset() will clear
// jest.fn().mockImplementation()

const db = jest.fn()

db.one = jest.fn()
db.one.mockResolvedValue()

db.oneOrNone = jest.fn()
db.oneOrNone.mockResolvedValue()

db.manyOrNone = jest.fn()
db.oneOrNone.mockResolvedValue()

db.any = jest.fn()
db.any.mockResolvedValue()

db.none = jest.fn()
db.none.mockResolvedValue()

db.result = jest.fn()
db.result.mockResolvedValue()

db.taskIf = jest.fn()
db.taskIf.mockImplementation(cb => cb(db))

db.tx = jest.fn()
db.tx.mockImplementation(
	cb =>
		new Promise(resolve => {
			resolve(cb(db))
		})
)

db.batch = jest.fn()
db.batch.mockImplementation(queries => Promise.all(queries))

class MockQueryResultError {
	constructor(code) {
		this.code = code
	}
}

db.errors = {
	queryResultErrorCode: {
		noData: 'noData',
		notEmpty: 'notEmpty',
		multiple: 'multiple'
	},
	QueryResultError: MockQueryResultError
}

module.exports = db
