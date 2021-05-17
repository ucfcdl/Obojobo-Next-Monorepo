// Ranges:
// Finite range: [1,2], [-3,9]
// Infinite range: [1,], [,9], [,]
// empty range (This is a range which accepts no values)

/**
 * A string used in a ValueRange
 * @typedef {string} ValueRangeString
 * @example "3" //3
 * @example "[3,4]" //Values 3 to 4
 * @example "(3,4)" //Values greater than 3 and less than 4
 * @example "(*,4]" //Values less than or equal to 4
 * @example "(3,*)" //Values greater than 3
 * @example "(*,*)" //Any value
 * @example "*" //Any value
 * @example "" //No value
 */

/**
 * Object describing a range.
 * @typedef {Object} ValueRangeObject
 * @property {*|null} [min]
 * @property {boolean|null} [isMinInclusive]
 * @property {*|null} [max]
 * @property {boolean|null} [isMaxInclusive]
 * @property {boolean} [isEmpty]
 * @example
 * {
 * 	min: 2,
 * 	isMinInclusive: true,
 * 	max: 4,
 * 	isMaxInclusive: false,
 * 	isEmpty: false
 * }
 */

/**
 * Represents a range of values which can be created using a range syntax. Allows you
 * to query the range to determine if values are less than, inside or greater than the
 * range. Ranges can be "singular" meaning they're singular values. You can also specify
 * a "empty" range which is simply a range with no valid values.
 * By default ValueRange works with numbers, however you can pass custom value parsing
 * functions and comparison functions to create a range to work with any value type.
 * @example
 * new ValueRange() // -Infinity to Infinity
 * new ValueRange(true) // -Infinity to Infinity
 * new ValueRange('(*,*)') // -Infinity to Infinity
 * new ValueRange({}) // -Infinity to Infinity
 * new ValueRange({ isEmpty:true }) // Empty range (no values)
 * new ValueRange('') // empty range (no values)
 * new ValueRange(null) // empty range (no values)
 * new ValueRange(false) // empty range (no values)
 * new ValueRange('6') // 6
 * new ValueRange('[6,7)') // >= 6 and < 7
 * new ValueRange('(*,7)') // < 7
 * new ValueRange('[6,*)') // >= 6
 * new ValueRange({ min:6, isMinInclusive:true, max:7, isMaxInclusive:true }) // 6 to 7
 * new ValueRange({ max:7, isMaxInclusive:true }) // <= 7
 */
class ValueRange {
	/**
	 * Parsed a ValueRangeString into a ValueRangeObject
	 * @param {ValueRangeString} rangeString
	 * @throws Will throw error if the rangeString is malformed
	 * @return {ValueRangeObject|null} (Returns null if a string was not passed)
	 */
	static parseRangeString(rangeString) {
		if (typeof rangeString === 'undefined' || rangeString === null) return null

		if (rangeString === '*') rangeString = '(*,*)'

		if (rangeString.indexOf(',') === -1) rangeString = `[${rangeString},${rangeString}]`

		if (rangeString.indexOf('[*') > -1 || rangeString.indexOf('*]') > -1) {
			throw 'Bad range string: * must be exclusive'
		}
		if (rangeString.indexOf('[') === -1 && rangeString.indexOf('(') === -1) {
			throw 'Bad range string: Missing [ or ('
		}
		if (rangeString.indexOf(']') === -1 && rangeString.indexOf(')') === -1) {
			throw 'Bad range string: Missing ] or )'
		}

		const values = rangeString.replace(/[([)\]]+/g, '')
		const rangeValues = values.split(',').map(s => s.trim())

		if (rangeValues[0].length === 0 || rangeValues[1].length === 0) {
			throw 'Bad range string: Missing values'
		}

		const min = rangeValues[0] === '*' ? null : rangeValues[0]
		const max = rangeValues[1] === '*' ? null : rangeValues[1]
		const isMinInclusive = min === null ? null : rangeString.charAt(0) === '['
		const isMaxInclusive = max === null ? null : rangeString.charAt(rangeString.length - 1) === ']'

		return {
			min,
			isMinInclusive,
			max,
			isMaxInclusive
		}
	}

	/**
	 * Default parse function which simply calls parseFloat on the given string
	 * @param {string} v
	 * @return {number|null}
	 */
	static DefaultParseValue(v) {
		const parsed = parseFloat(v)
		return Number.isFinite(parsed) ? parsed : null
	}

	/**
	 * Default comparison function which does a basic numeric comparison
	 * @param {number} a
	 * @param {number} b
	 * @return {(-1|0|1)}
	 */
	static DefaultNumberCompare(a, b) {
		if (a === b) return 0
		if (a < b) return -1
		return 1
	}

	/**
	 * Default serialize function which simply returns the value passed
	 * @param {number|null} o
	 * @return {number}
	 */
	static DefaultSerialize(o) {
		if (o === null) return o
		return o.toJSON ? o.toJSON() : o
	}

	/**
	 * Default toString function
	 * @param {number|null} o
	 * @return {number|null}
	 */
	static DefaultToString(o) {
		return o === null ? '*' : o.toString()
	}

	/**
	 * Create a new ValueRange instance
	 * @param {ValueRangeString|ValueRangeObject} rangeStringOrRangeObject
	 * @param {function} [parseFn=DefaultParseValue]
	 * @param {function} [compareFn=DefaultNumberCompare]
	 */
	constructor(
		rangeStringOrRangeObject = '*',
		parseFn = this.constructor.DefaultParseValue,
		compareFn = this.constructor.DefaultNumberCompare,
		serializeFn = this.constructor.DefaultSerialize,
		toStringFn = this.constructor.DefaultToString
	) {
		/**
		 * If true then this is a range which accepts no values.
		 */
		this.isEmpty = false

		/**
		 * The minimum value of the range. If equal to null then it is considered to
		 * be -Infinity (i.e. there is no minimum)
		 */
		this.min = null

		/**
		 * If true then the minimum of the range is included in the range. This value
		 * has no effect if this.min is null.
		 */
		this.isMinInclusive = null

		/**
		 * The maximum value of the range. If equal to null then it is considered to
		 * be Infinity (i.e. there is no maximum)
		 */
		this.max = null

		/**
		 * If true then the maximum of the range is included in the range. This value
		 * has no effect if this.max is null.
		 */
		this.isMaxInclusive = null

		/**
		 * Function used when comparing two values. Should return a negative number if
		 * the first value is smaller than the second, a 0 if they are equal or a positive
		 * value if the first value is larger than the second. This allows you to
		 * create ranges where the values aren't numbers but any type of data you want.
		 * However by default this is equal to parseFloat, meaning ValueRanges will work
		 * with numbers by default.
		 * @type {function}
		 */
		this.compareFn = compareFn

		/**
		 * Function used on min and max when toJSON is called.
		 * @type {function}
		 */
		this.serializeFn = serializeFn

		/**
		 * Function used on min and max when toString is called.
		 * @type {function}
		 */
		this.toStringFn = toStringFn

		if (
			!rangeStringOrRangeObject ||
			(typeof rangeStringOrRangeObject === 'object' && rangeStringOrRangeObject.isEmpty)
		) {
			this.empty()
			return
		}

		this.init()

		if (typeof rangeStringOrRangeObject === 'string') {
			rangeStringOrRangeObject = this.constructor.parseRangeString(rangeStringOrRangeObject)
		}

		if (typeof rangeStringOrRangeObject === 'object') {
			const o = rangeStringOrRangeObject

			if (typeof o.min !== 'undefined') {
				this.min = parseFn(o.min)
			} else {
				this.min = null
			}

			if (typeof o.max !== 'undefined') {
				this.max = parseFn(o.max)
			} else {
				this.max = null
			}

			if (this.min === null) {
				this.isMinInclusive = null
			} else if (typeof o.isMinInclusive !== 'undefined') {
				this.isMinInclusive = !!o.isMinInclusive
			} else {
				this.isMinInclusive = true
			}

			if (this.max === null) {
				this.isMaxInclusive = null
			} else if (typeof o.isMaxInclusive !== 'undefined') {
				this.isMaxInclusive = !!o.isMaxInclusive
			} else {
				this.isMaxInclusive = true
			}

			// A range like (1,1) is a empty range, convert accordingly
			if (
				this.min !== null &&
				this.max !== null &&
				this.min === this.max &&
				!this.isMinInclusive &&
				!this.isMaxInclusive
			) {
				this.empty()
				return
			}

			// A range like (1,1] is unclear (greater than 1 and equal to 1), throw error
			if (
				this.min !== null &&
				this.max !== null &&
				this.min === this.max &&
				(this.isMinInclusive !== true || this.isMaxInclusive !== true)
			) {
				throw 'Invalid range: Singular range must have inclusive min and max'
			}

			// A range like [1,-1] is inverted, throw error
			if (this.min !== null && this.max !== null && this.compareFn(this.min, this.max) > 0) {
				throw 'Invalid range: min value must be larger than max value'
			}
		}
	}

	/**
	 * Resets values to a infinite range (all values)
	 */
	init() {
		this.isEmpty = false
		this.min = null
		this.isMinInclusive = null
		this.max = null
		this.isMaxInclusive = null
	}

	/**
	 * Resets values to an empty range
	 */
	empty() {
		this.isEmpty = true
		this.min = null
		this.isMinInclusive = null
		this.max = null
		this.isMaxInclusive = null
	}

	/**
	 * Determine if a given value sits inside the range
	 * @param {*} value
	 * @return {boolean}
	 * @example
	 * const range = new ValueRange('[2,4]')
	 * range.isValueInRange(2) //true
	 * range.isValueInRange(1) //false
	 */
	isValueInRange(value) {
		return this.getValuePosition(value) === this.constructor.VALUE_INSIDE
	}

	/**
	 * Determine the position of value compared to the range's min value
	 * @param {*} value
	 * @return {'empty'|'equal'|'above'|'below'}
	 * @example
	 * const range = new ValueRange('[2,4]')
	 * range.getMinValuePosition(2) //'equal'
	 * range.getMinValuePosition(1) //'below'
	 * range.getMinValuePosition(5) //'above'
	 */
	getMinValuePosition(value) {
		if (this.isEmpty) return this.constructor.VALUE_EMPTY_RANGE
		if (this.isMinInclusive && this.minEq(value)) return this.constructor.VALUE_EQUAL
		if (this.minLt(value)) return this.constructor.VALUE_ABOVE
		return this.constructor.VALUE_BELOW
	}

	/**
	 * Determine the position of value compared to the range's max value
	 * @param {*} value
	 * @return {'empty'|'equal'|'above'|'below'}
	 * @example
	 * const range = new ValueRange('[2,4]')
	 * range.getMinValuePosition(4) //'equal'
	 * range.getMinValuePosition(1) //'below'
	 * range.getMinValuePosition(5) //'above'
	 */
	getMaxValuePosition(value) {
		if (this.isEmpty) return this.constructor.VALUE_EMPTY_RANGE
		if (this.isMaxInclusive && this.maxEq(value)) return this.constructor.VALUE_EQUAL
		if (this.maxGt(value)) return this.constructor.VALUE_BELOW
		return this.constructor.VALUE_ABOVE
	}

	/**
	 * Determine if value is equal to or above the range's min value
	 * @param {*} value
	 * @return {boolean}
	 * @example
	 * const range = new ValueRange('[2,4]')
	 * range.isValueWithinMin(1) //false
	 * range.isValueWithinMin(2) //true
	 * range.isValueWithinMin(5) //true
	 */
	isValueWithinMin(value) {
		switch (this.getMinValuePosition(value)) {
			case this.constructor.VALUE_EQUAL:
			case this.constructor.VALUE_ABOVE:
				return true
		}

		return false
	}

	/**
	 * Determine if value is equal to or below the range's max value
	 * @param {*} value
	 * @return {boolean}
	 * @example
	 * const range = new ValueRange('[2,4]')
	 * range.isValueWithinMax(5) //false
	 * range.isValueWithinMax(4) //true
	 * range.isValueWithinMax(1) //true
	 */
	isValueWithinMax(value) {
		switch (this.getMaxValuePosition(value)) {
			case this.constructor.VALUE_EQUAL:
			case this.constructor.VALUE_BELOW:
				return true
		}

		return false
	}

	/**
	 * Determine the position of value compared to the range
	 * @param {*} value
	 * @return {'empty'|'inside'|'above'|'below'}
	 * @example
	 * const range = new ValueRange('[2,4]')
	 * range.getValuePosition(1) //'below'
	 * range.getValuePosition(2) //'inside'
	 * range.getValuePosition(3) //'inside'
	 * range.getValuePosition(4) //'inside'
	 * range.getValuePosition(5) //'above'
	 */
	getValuePosition(value) {
		// By definition a value is not inside a empty range
		if (this.isEmpty) return this.constructor.VALUE_EMPTY_RANGE

		const isMinRequirementMet = this.isValueWithinMin(value)
		const isMaxRequirementMet = this.isValueWithinMax(value)

		if (isMinRequirementMet && isMaxRequirementMet) {
			return this.constructor.VALUE_INSIDE
		}

		if (isMinRequirementMet) {
			return this.constructor.VALUE_ABOVE_MAX
		}

		return this.constructor.VALUE_BELOW_MIN
	}

	/**
	 * Creates a ValueRangeString representation of this range.
	 * @returns {ValueRangeString}
	 */
	toString() {
		if (this.isEmpty) return ''
		if (this.isSingular) return this.toStringFn(this.min)
		if (this.isUniversal) return '(*,*)'

		let lhs = ''
		if (this.isMinInclusive === true) {
			lhs = '['
		} else {
			lhs = '('
		}

		let rhs = ''
		if (this.isMaxInclusive === true) {
			rhs = ']'
		} else {
			rhs = ')'
		}

		return `${lhs}${this.toStringFn(this.min)},${this.toStringFn(this.max)}${rhs}`
	}

	/**
	 * Returns a ValueRangeObject representing this range.
	 * @return {ValueRangeObject}
	 */
	toJSON() {
		return {
			isEmpty: this.isEmpty,
			min: this.serializeFn(this.min),
			max: this.serializeFn(this.max),
			isMinInclusive: this.isMinInclusive,
			isMaxInclusive: this.isMaxInclusive
		}
	}

	/**
	 * Creates a copy of this range
	 * @return {ValueRange}
	 */
	clone() {
		return new this.constructor(this.toJSON())
	}

	/**
	 * Determine how the given value compares to this range's min value
	 * @param {*} v
	 * @return {number} Negative value if v < min, 0 if equal, positive if v > min
	 */
	minCompare(v) {
		return this.min === null ? 1 : this.compareFn(v, this.min)
	}

	/**
	 * Determine if this range's min value is equal to the given value
	 * @param {*} v
	 * @return {boolean}
	 */
	minEq(v) {
		return this.minCompare(v) === 0
	}

	/**
	 * Determine if this range's min value is < the given value
	 * @param {*} v
	 * @return {boolean}
	 */
	minLt(v) {
		return this.minCompare(v) > 0
	}

	/**
	 * Determine if this range's min value is <= the given value
	 * @param {*} v
	 * @return {boolean}
	 */
	minLte(v) {
		return this.minCompare(v) >= 0
	}

	/**
	 * Determine if this range's min value is > the given value
	 * @param {*} v
	 * @return {boolean}
	 */
	minGt(v) {
		return this.minCompare(v) < 0
	}

	/**
	 * Determine if this range's min value is >= the given value
	 * @param {*} v
	 * @return {boolean}
	 */
	minGte(v) {
		return this.minCompare(v) <= 0
	}

	/**
	 * Determine how the given value compares to this range's max value
	 * @param {*} v
	 * @return {number} Negative value if v < max, 0 if equal, positive if v > max
	 */
	maxCompare(v) {
		return this.max === null ? -1 : this.compareFn(v, this.max)
	}

	/**
	 * Determine if this range's max value is equal to the given value
	 * @param {*} v
	 * @return {boolean}
	 */
	maxEq(v) {
		return this.maxCompare(v) === 0
	}

	/**
	 * Determine if this range's max value is < the given value
	 * @param {*} v
	 * @return {boolean}
	 */
	maxLt(v) {
		return this.maxCompare(v) > 0
	}

	/**
	 * Determine if this range's max value is <= the given value
	 * @param {*} v
	 * @return {boolean}
	 */
	maxLte(v) {
		return this.maxCompare(v) >= 0
	}

	/**
	 * Determine if this range's max value is > the given value
	 * @param {*} v
	 * @return {boolean}
	 */
	maxGt(v) {
		return this.maxCompare(v) < 0
	}

	/**
	 * Determine if this range's max value is >= the given value
	 * @param {*} v
	 * @return {boolean}
	 */
	maxGte(v) {
		return this.maxCompare(v) <= 0
	}

	/**
	 * True if this range is a singular value, false otherwise
	 * @type {boolean}
	 */
	get isSingular() {
		return (
			!this.isEmpty &&
			this.min !== null &&
			this.max !== null &&
			this.minEq(this.max) &&
			this.isMinInclusive &&
			this.isMaxInclusive
		)
	}

	/**
	 * True if this range is finite (i.e. [6,7]), false otherwise (i.e. (*,7])
	 * @type {boolean}
	 */
	get isBounded() {
		return this.isEmpty || (this.min !== null && this.max !== null)
	}

	/**
	 * True if the min value of this range is finite (i.e. [6,...), false otherwise (i.e. (*,...)
	 * @type {boolean}
	 */
	get isLowerBounded() {
		return this.isEmpty || this.min !== null
	}

	/**
	 * True if the max value of this range is finite (i.e. ...,9]), false otherwise (i.e. ...,*))
	 * @type {boolean}
	 */
	get isUpperBounded() {
		return this.isEmpty || this.max !== null
	}

	/**
	 * True if this range is the set of all values (-Infinity to Infinity) (i.e. '*')
	 * @type {boolean}
	 */
	get isUniversal() {
		return !this.isEmpty && this.min === null && this.max === null
	}
}

// Values for empty ranges:
ValueRange.VALUE_EMPTY_RANGE = 'empty'

// Values for non-empty ranges:
ValueRange.VALUE_INSIDE = 'inside'
ValueRange.VALUE_BELOW_MIN = 'belowMin'
ValueRange.VALUE_ABOVE_MAX = 'aboveMax'

// Values for the min or max properties of ranges:
ValueRange.VALUE_BELOW = 'below'
ValueRange.VALUE_ABOVE = 'above'
ValueRange.VALUE_EQUAL = 'equal'

module.exports = ValueRange
