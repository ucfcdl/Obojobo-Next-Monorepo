import React from 'react'

import {
	EXACT_ANSWER,
	MARGIN_OF_ERROR,
	WITHIN_A_RANGE,
	requirementDropdown,
	marginDropdown,
	simplifedToFullText,
	PERCENT
} from '../constants'
import NumericEntry from '../entry/numeric-entry'
import {
	OK,
	INPUT_INVALID,
	INPUT_NOT_SAFE,
	INPUT_MATCHES_MULTIPLE_TYPES,
	INPUT_NOT_MATCHED
} from '../entry/numeric-entry-statuses'
import NumericEntryRange from '../range/numeric-entry-range'
import isRefRelatedTarget from './is-ref-related-target'

const RANGE_ERROR_SINGULAR = 'singular'
const RANGE_ERROR_INVERTED = 'inverted'

const getValidityString = valueString => {
	if (valueString === '') {
		return 'Missing a value'
	}

	switch (new NumericEntry(valueString).status) {
		case OK:
			return ''

		case INPUT_NOT_SAFE:
			return 'This answer is too large of a value'

		case INPUT_MATCHES_MULTIPLE_TYPES:
			return 'This answer matches multiple types'

		case INPUT_NOT_MATCHED:
			return "This answer doesn't match one of the allowed numeric types"

		case INPUT_INVALID:
		default:
			return 'Not a valid numeric value'
	}
}

const getRangeError = (startValueString, endValueString) => {
	// Use NumericEntryRange to determine if this is a valid range...
	try {
		const range = new NumericEntryRange(`[${startValueString},${endValueString}]`)

		if (range.isSingular) {
			// The start and end values of the range are the same (such as [1,1])
			return RANGE_ERROR_SINGULAR
		}
	} catch (e) {
		if (e === 'Invalid range: min value must be larger than max value') {
			// The range is backwards, such as [10,0]
			return RANGE_ERROR_INVERTED
		}

		// If there is some other error it's most likely because the values passed
		// in are malformed, in that case, we'll let the other input validation
		// handle it instead
	}

	return ''
}

const getRangeStartValidityString = (startValueString, endValueString) => {
	switch (getRangeError(startValueString, endValueString)) {
		case RANGE_ERROR_SINGULAR:
			return 'Start value should be smaller than the end value'

		case RANGE_ERROR_INVERTED:
			return "Start value can't be larger than the end value"

		default:
			return getValidityString(startValueString)
	}
}

const getRangeEndValidityString = (startValueString, endValueString) => {
	switch (getRangeError(startValueString, endValueString)) {
		case RANGE_ERROR_SINGULAR:
			return 'End value should be larger than the start value'

		case RANGE_ERROR_INVERTED:
			return "End value can't be smaller than the start value"

		default:
			return getValidityString(endValueString)
	}
}

const getMarginOfErrorAnswerValidityString = (answer, errorType) => {
	// Filter out leading zeroes
	const parsedAnswer = parseInt(answer, 10)

	switch (simplifedToFullText[errorType]) {
		case PERCENT: {
			if (parsedAnswer === 0) {
				return 'Answer cannot be 0 while Error Type is Percent'
			} else {
				return ''
			}
		}
		default:
			return ''
	}
}

const NumericOption = ({ numericChoice, onHandleInputChange, onHandleSelectChange }) => {
	const answerRef = React.createRef()

	const marginErrorTypeRef = React.createRef()

	const inputStartRef = React.createRef()
	const inputEndRef = React.createRef()
	const { requirement, answer, start, end, margin, type } = numericChoice

	// Clear out any custom validity after a field changes to ensure old errors don't show
	const clearCustomValidity = () => {
		if (answerRef.current) {
			answerRef.current.setCustomValidity('')
		}

		if (inputStartRef.current) {
			inputStartRef.current.setCustomValidity('')
		}

		if (inputEndRef.current) {
			inputEndRef.current.setCustomValidity('')
		}

		if (marginErrorTypeRef.current) {
			marginErrorTypeRef.current.setCustomValidity('')
		}
	}

	const onAnswerTypeChange = event => {
		clearCustomValidity()
		onHandleSelectChange(event)
	}

	const onChangeNumericValue = event => {
		// Clear out the error string and then update state
		event.target.setCustomValidity('')
		onHandleInputChange(event)
	}

	const onBlurAnswer = event => {
		clearCustomValidity()

		// Get normal error validity string
		let answerValidityString = getValidityString(event.target.value)

		// Validate for margin of error
		if (answerValidityString === '' && !isRefRelatedTarget(event, marginErrorTypeRef)) {
			answerValidityString = getMarginOfErrorAnswerValidityString(event.target.value, type)
		}

		event.target.setCustomValidity(answerValidityString)
		event.target.reportValidity()
	}

	const onBlurErrorValue = event => {
		clearCustomValidity()

		const errorAmount = parseFloat(event.target.value)

		if (!Number.isFinite(errorAmount)) {
			event.target.setCustomValidity('Enter a numeric error amount')
		} else if (errorAmount <= 0) {
			event.target.setCustomValidity('Error amount must be greater than 0')
		} else {
			event.target.setCustomValidity('')
		}

		event.target.reportValidity()
	}

	const onBlurStart = event => {
		clearCustomValidity()
		// If the user is moving to a related input then don't show range errors.
		// If we don't do this then the user might be in the middle of typing a range
		// and would be forced to fix it before they're done inputting the range
		if (!isRefRelatedTarget(event, inputEndRef)) {
			event.target.setCustomValidity(getRangeStartValidityString(event.target.value, end))
			event.target.reportValidity()
			return
		}

		onBlurAnswer(event)
	}

	const onBlurEnd = event => {
		clearCustomValidity()
		// If the user is moving to a related input then don't show range errors.
		// If we don't do this then the user might be in the middle of typing a range
		// and would be forced to fix it before they're done inputting the range
		if (!isRefRelatedTarget(event, inputStartRef)) {
			event.target.setCustomValidity(getRangeEndValidityString(start, event.target.value))
			event.target.reportValidity()
			return
		}

		onBlurAnswer(event)
	}

	const onBlurMarginOfErrorType = event => {
		clearCustomValidity()

		// If not moving to related input, get validity string
		if (!isRefRelatedTarget(event, answerRef)) {
			event.target.setCustomValidity(getMarginOfErrorAnswerValidityString(answer, type))
			event.target.reportValidity()
		}
	}

	switch (simplifedToFullText[requirement]) {
		case WITHIN_A_RANGE:
			return (
				<div className="is-type-range">
					<label className="select requirement">
						Answer Type
						<select
							className="select-item"
							name="requirement"
							value={simplifedToFullText[requirement]}
							onChange={onAnswerTypeChange}
						>
							{requirementDropdown.map(requirement => (
								<option key={requirement}>{requirement}</option>
							))}
						</select>
					</label>
					<label className="input start">
						Start
						<input
							ref={inputStartRef}
							className="input-item"
							name="start"
							value={start || ''}
							onChange={onChangeNumericValue}
							onBlur={onBlurStart}
							contentEditable={false}
							autoComplete="off"
						/>
					</label>
					<label className="input end">
						End
						<input
							ref={inputEndRef}
							className="input-item"
							name="end"
							value={end || ''}
							onChange={onChangeNumericValue}
							onBlur={onBlurEnd}
							contentEditable={false}
							autoComplete="off"
						/>
					</label>
				</div>
			)
		case MARGIN_OF_ERROR:
			return (
				<div className="is-type-margin">
					<label className="select requirement">
						Answer Type
						<select
							className="select-item"
							name="requirement"
							value={simplifedToFullText[requirement]}
							onChange={onAnswerTypeChange}
						>
							{requirementDropdown.map(requirement => (
								<option key={requirement}>{requirement}</option>
							))}
						</select>
					</label>
					<label className="input answer">
						Answer
						<input
							className="input-item"
							name="answer"
							value={answer || ''}
							onChange={onChangeNumericValue}
							onBlur={onBlurAnswer}
							contentEditable={false}
							autoComplete="off"
							ref={answerRef}
						/>
					</label>
					<label className="select margin-type">
						Error Type
						<select
							className="select-item"
							name="margin-type"
							value={simplifedToFullText[type]}
							onChange={onHandleSelectChange}
							ref={marginErrorTypeRef}
							onBlur={onBlurMarginOfErrorType}
						>
							{marginDropdown.map(type => (
								<option key={type}>{type}</option>
							))}
						</select>
					</label>
					<label className="input margin-value">
						{type === 'percent' ? '% Error' : '± Error'}
						<input
							className="input-item"
							name="margin"
							value={margin || ''}
							onChange={onChangeNumericValue}
							onBlur={onBlurErrorValue}
							contentEditable={false}
							autoComplete="off"
						/>
					</label>
				</div>
			)
		default:
		case EXACT_ANSWER:
			return (
				<div className="is-type-exact">
					<label className="select requirement">
						Answer Type
						<select
							className="select-item"
							name="requirement"
							value={simplifedToFullText[requirement]}
							onChange={onHandleSelectChange}
						>
							{requirementDropdown.map(requirement => (
								<option key={requirement}>{requirement}</option>
							))}
						</select>
					</label>
					<label className="input answer">
						Answer
						<input
							className="input-item"
							name="answer"
							value={answer || ''}
							onChange={onChangeNumericValue}
							onBlur={onBlurAnswer}
							contentEditable={false}
							autoComplete="off"
						/>
					</label>
				</div>
			)
	}
}

export default NumericOption
