const {
	HEX_TYPE_ZERO_X,
	HEX_TYPE_OCTOTHORPE,
	HEX_TYPE_DOLLAR_SIGN,
	HEX_TYPE_NO_PREFIX,
	HEX_TYPE_INFERRED
} = require('./types/hexadecimal-types')
const { INPUT_TYPE_HEXADECIMAL } = require('./types/input-types')
const { MATCH_EXACT, MATCH_INFERRED, MATCH_NONE } = require('../entry/match-types')
const Numeric = require('./numeric')
const Decimal = require('./decimal')
const big = require('../big')

const hexZeroX = /^0x[0-9a-fA-F]+$|^0x[0-9a-fA-F]+$/
const hexOctothorpe = /^#[0-9a-fA-F]+$|^#[0-9a-fA-F]+$/
const hexDollarSign = /^\$[0-9a-fA-F]+$|^\$[0-9a-fA-F]+$/
const hexNoPrefix = /^[0-9a-fA-F]*[a-fA-F][0-9a-fA-F]*$|^[0-9a-fA-F]*[a-fA-F][0-9a-fA-F]*$/
const hexInferred = /^[0-9]+$|^[0-9]+$/

/**
 * A hexadecimal numeric type. Values should be prefixed with "0x" but "#" or "$" may also be used.
 * Values are also possible hex matches if given a string with only 0-9 and A-F.
 * @example
 * new Hexadecimal("0xFF")
 * new Hexadecimal("#FF9900")
 * new Hexadecimal("$6928")
 * new Hexadecimal("B0283") // 'inferred' hex value
 */
module.exports = class Hexadecimal extends Numeric {
	/**
	 * A string representing this type
	 * @type {'hex'}
	 */
	static get type() {
		return INPUT_TYPE_HEXADECIMAL
	}

	/**
	 * A human friendly label for this type
	 * @type {'Hexadecimal'}
	 */
	static get label() {
		return 'Hexadecimal'
	}

	/**
	 * Determines the syntax type
	 * @param {string} str
	 * @return {string|null} Either 'hexZeroX', 'hexOctothorpe', 'hexDollarSign', 'hexNoPrefix', 'hexInferred' or null if not hexadecimal
	 */
	static getInputType(str) {
		if (hexZeroX.test(str)) return HEX_TYPE_ZERO_X
		if (hexOctothorpe.test(str)) return HEX_TYPE_OCTOTHORPE
		if (hexDollarSign.test(str)) return HEX_TYPE_DOLLAR_SIGN
		if (hexNoPrefix.test(str)) return HEX_TYPE_NO_PREFIX
		if (hexInferred.test(str)) return HEX_TYPE_INFERRED

		return null
	}

	/**
	 * Get the value string portion of a possible hex string
	 * @param {string} str
	 * @return {string|null}
	 * @example
	 * Hexadecimal.getValueString('0xFF') //'0xFF'
	 * Hexadecimal.getValueString('FF') //'FF'
	 * Hexadecimal.getValueString('3.9') //null
	 */
	static getValueString(str) {
		switch (Hexadecimal.getInputType(str)) {
			case HEX_TYPE_ZERO_X:
				return hexZeroX.exec(str)[0].trim()

			case HEX_TYPE_OCTOTHORPE:
				return hexOctothorpe.exec(str)[0].trim()

			case HEX_TYPE_DOLLAR_SIGN:
				return hexDollarSign.exec(str)[0].trim()

			case HEX_TYPE_NO_PREFIX:
				return hexNoPrefix.exec(str)[0].trim()

			case HEX_TYPE_INFERRED:
				return hexInferred.exec(str)[0].trim()
		}

		return null
	}

	/**
	 * Gets details about an answer string.
	 * @param {string} str A potential string representation of a hex value
	 * @return {NumericParseObject|NullNumericParseObject}
	 * @example
	 * Hexadecimal.parse("0xFF") //{ matchType:'exact', valueString:'0xFF' }
	 * Hexadecimal.parse("FF") //{ matchType:'inferred', valueString:'FF' }
	 * Hexadecimal.parse("101.1") //{ matchType:'none', valueString:'' }
	 */
	static parse(str) {
		const valueString = Hexadecimal.getValueString(str)
		if (!valueString) return Numeric.getNullParseObject()

		return {
			matchType: Hexadecimal.getMatchType(valueString),
			valueString
		}
	}

	/**
	 * Determine if this is an exact match, an inferred match, or not a match
	 * @param {string} str
	 * @return {string} 'exact' | 'inferred' | 'none'
	 * @example
	 * Hexadecimal.getMatchType('0xFF') //'exact'
	 * Hexadecimal.getMatchType('FF') //'inferred'
	 * Hexadecimal.getMatchType('101.1') //'none'
	 */
	static getMatchType(str) {
		switch (this.getInputType(str)) {
			case HEX_TYPE_ZERO_X:
			case HEX_TYPE_OCTOTHORPE:
			case HEX_TYPE_DOLLAR_SIGN:
				return MATCH_EXACT

			case HEX_TYPE_INFERRED:
			case HEX_TYPE_NO_PREFIX:
				return MATCH_INFERRED
		}

		return MATCH_NONE
	}

	/**
	 * Determine if the given string hex representation can be safely converted
	 * @param {string} valueString
	 * @return {boolean} True if the string representation is less than Number.MAX_SAFE_INTEGER
	 */
	static isSafe(valueString) {
		return Hexadecimal.getNumberFromString(valueString) <= Number.MAX_SAFE_INTEGER
	}

	/**
	 * Get the string representation of a Big value
	 * @param {Big} bigValue
	 * @return {string}
	 * @example
	 * Hexadecimal.getString(big(2)) //"0x2"
	 * Hexadecimal.getString(big(255)) //"0xFF"
	 */
	static getString(bigValue) {
		return `0x${Number(bigValue)
			.toString(16)
			.toUpperCase()}`
	}

	/**
	 * Get a Big instance for a given value string
	 * @param {string} valueString
	 * @return {string}
	 * @example
	 * Hexadecimal.getBigValueFromString('0x2') //big(2)
	 * Hexadecimal.getBigValueFromString('0xFF') //big(255)
	 */
	static getBigValueFromString(valueString) {
		return big(Hexadecimal.getNumberFromString(valueString))
	}

	/**
	 * Get a number for a given value string
	 * @param {string} valueString
	 * @return {string}
	 * @example
	 * Hexadecimal.getNumberFromString('0x2') //2
	 * Hexadecimal.getNumberFromString('FF') //255
	 */
	static getNumberFromString(valueString) {
		switch (this.getInputType(valueString)) {
			case HEX_TYPE_ZERO_X:
				return Number(valueString)

			case HEX_TYPE_OCTOTHORPE:
				return Number('0x' + valueString.replace('#', ''))

			case HEX_TYPE_DOLLAR_SIGN:
				return Number('0x' + valueString.replace('$', ''))

			case HEX_TYPE_NO_PREFIX:
			case HEX_TYPE_INFERRED:
				return Number('0x' + valueString)
		}
	}

	/**
	 * Converts the hexadecimal value to decimal and then returns the number of significant figures.
	 * @param {string} valueString
	 * @return {number} The number of significant figures of this instance
	 * @example
	 * Hexadecimal.getNumSigFigs('0x2') //1
	 * Hexadecimal.getNumSigFigs('FF') //3
	 */
	static getNumSigFigs(valueString) {
		return Decimal.getNumSigFigs(Hexadecimal.getBigValueFromString(valueString).toString())
	}

	/**
	 * Hexadecimal values are always integers
	 * @return {true}
	 */
	static getIsInteger() {
		return true
	}

	/**
	 * Hexadecimal numbers are integers so this is always 0
	 * @param {string} valueString
	 * @return {0}
	 * @example
	 * Hexadecimal.getNumDecimalDigits('0xFF') //0
	 */
	static getNumDecimalDigits() {
		return 0
	}
}
