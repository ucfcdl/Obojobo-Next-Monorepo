const ValueRange = require('./value-range')
const big = require('../big')

/**
 * A type of ValueRange but for Big values instead of numbers.
 * @example
 * const range = new BigValueRange('[2,4]')
 * range.min // Equal to big(2)
 * range.max // Equal to big(4)
 */
module.exports = class BigValueRange extends ValueRange {
	/**
	 * Compare two Big numbers
	 * @param {Big} a
	 * @param {Big} b
	 * @return {-1|0|1}
	 */
	static compareValues(a, b) {
		if (a.eq(b)) return 0
		if (a.lt(b)) return -1
		return 1
	}

	/**
	 * Creates a Big value from a string
	 * @param {string} inputString
	 * @return {Big}
	 */
	static parseValue(inputString) {
		if (inputString === null) return null
		return big(inputString)
	}

	/**
	 * Create a new BigValueRange
	 * @param {ValueRangeString|ValueRangeObject} rangeStringOrRangeObject
	 */
	constructor(rangeStringOrRangeObject = '*') {
		super(rangeStringOrRangeObject, BigValueRange.parseValue, BigValueRange.compareValues)
	}
}
