const {
	MATCH_EXACT,
	MATCH_INFERRED,
	MULTIPLE_EXACT,
	MULTIPLE_INFERRED,
	SINGLE_EXACT,
	SINGLE_INFERRED,
	NO_MATCHES
} = require('./match-types')

/**
 * Organizes and contains Numeric instances based on an input string. Instances are
 * organized by their match type (typically either `exact` or `inferred`).
 * @example
 * const matches = new NumericMatches()
 *
 * matches.add(new Decimal('9.8'))
 * matches.add(new Hexadecimal('FF0A'))
 *
 * matches.getNumericTypesForMatches('exact').numericTypes // ['decimal']
 * matches.getNumericTypesForMatches('inferred').numericTypes // ['hexadecimal']
 * matches.status // 'singleExact'
 *
 * matches.add(new Decimal('14g'))
 * matches.status // 'multipleExact'
 */
module.exports = class NumericMatches {
	constructor() {
		/**
		 * Object with the key as the match type and the value an array of matching numeric types
		 * @type {object}
		 */
		this.matches = {}
		this.matches[MATCH_EXACT] = []
		this.matches[MATCH_INFERRED] = []

		/**
		 * Object with the key as the numeric type and the value a Numeric instance
		 * @type {object}
		 */
		this.instances = {}

		/**
		 * Object with the key as the numeric type and the value the match type
		 * @type {object}
		 */
		this.matchTypes = {}

		/**
		 * Equal to the number of Numeric instances contained in this collection
		 * @type {number}
		 */
		this.numMatches = 0
	}

	/**
	 * Add another Numeric instance to the collection
	 * @param {Numeric} numericInstance
	 */
	add(numericInstance) {
		const numericType = numericInstance.type
		const matchType = numericInstance.matchType

		this.matches[matchType].push(numericType)
		this.instances[numericType] = numericInstance
		this.matchTypes[numericType] = matchType
		this.numMatches++
	}

	/**
	 * Remove a Numeric instance from the collection
	 * @param {Numeric} numericType
	 */
	remove(numericType) {
		const matchesForNumericType = this.getMatchesForNumericType(numericType)
		if (matchesForNumericType.matchType === null) return

		const matches = this.matches[matchesForNumericType.matchType]

		this.numMatches--
		delete this.instances[numericType]
		delete this.matchTypes[numericType]
		matches.splice(matches.indexOf(numericType), 1)
	}

	/**
	 * Return an object containing the matching information for a given Numeric type
	 * @param {string} numericType (i.e. `'decimal'`, `'binary'`, ...)
	 * @return {object} Details
	 * @property {string} matchType (i.e. `'exact'`, `'inferred'`)
	 * @property {Numeric} instance
	 */
	getMatchesForNumericType(numericType) {
		const matchType = this.matchTypes[numericType] || null
		const instance = this.instances[numericType] || null

		return {
			matchType,
			instance
		}
	}

	/**
	 * Return an object containing the matching information for a given match type
	 * @param {string} matchType (i.e. `'exact'`, `'inferred'`)
	 * @return {object} Details
	 * @property {string[]} numericTypes
	 * @property {Numeric[]} instances
	 */
	getNumericTypesForMatches(matchType) {
		if (matchType !== MATCH_EXACT && matchType !== MATCH_INFERRED) throw 'Invalid matchType given'

		const numericTypes = [].concat(this.matches[matchType])
		const instances = numericTypes.map(t => this.instances[t])

		return {
			numericTypes,
			instances
		}
	}

	/**
	 * Returns the instance of the given numeric type, if it exists
	 * @param {string} numericType (i.e. `'decimal'`)
	 * @return {Numeric|null}
	 */
	getInstance(numericType) {
		return this.instances[numericType] || null
	}

	/**
	 * String representing the quantity of matches.
	 * @type {'multipleExact'|'singleExact'|'multipleInferred'|'singleInferred'|'noMatches'}
	 */
	get status() {
		const exactMatches = this.getNumericTypesForMatches(MATCH_EXACT).numericTypes
		const inferredMatches = this.getNumericTypesForMatches(MATCH_INFERRED).numericTypes

		if (exactMatches.length > 1) {
			return MULTIPLE_EXACT
		}

		if (exactMatches.length === 1) {
			return SINGLE_EXACT
		}

		if (inferredMatches.length > 1) {
			return MULTIPLE_INFERRED
		}

		if (inferredMatches.length === 1) {
			return SINGLE_INFERRED
		}

		return NO_MATCHES
	}
}
