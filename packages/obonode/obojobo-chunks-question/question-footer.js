import Common from 'Common'
import QuestionOutcome from './question-outcome'
import React from 'react'

const { Button } = Common.components

const buttonLabels = {
	default: {
		buttonSubmitLabel: 'Check Your Answer',
		buttonResetLabel: 'Try Again',
		buttonResetAriaLabel: 'Try Question Again'
	},
	survey: {
		buttonSubmitLabel: 'Submit Response',
		buttonResetLabel: 'Change Response',
		buttonResetAriaLabel: 'Change Response'
	}
}

const QuestionFooter = props => {
	const score = props.score
	const hasResponse = props.hasResponse
	const isAnswerScored = score !== null // Question has been submitted in practice or scored by server in assessment
	const detailedText = props.detailedText
	const isAnswerRevealed = props.isAnswerRevealed
	const shouldShowRevealAnswerButton = props.shouldShowRevealAnswerButton

	const { buttonSubmitLabel, buttonResetLabel, buttonResetAriaLabel } = buttonLabels[props.type]

	return (
		<div className="submit-and-result-container">
			{props.mode === 'practice' || isAnswerRevealed ? (
				<div className="submit">
					{isAnswerScored || isAnswerRevealed ? (
						<Button
							altAction
							onClick={props.onClickReset}
							value={buttonResetLabel}
							ariaLabel={buttonResetAriaLabel}
						/>
					) : (
						<Button value={buttonSubmitLabel} disabled={!hasResponse} isSubmittable />
					)}
				</div>
			) : null}
			{isAnswerScored ? (
				<QuestionOutcome
					mode={props.mode}
					type={props.type}
					score={score}
					feedbackText={props.feedbackText}
				/>
			) : null}
			{shouldShowRevealAnswerButton ? (
				<Button
					className="reveal-answer-button"
					altAction
					value={'Reveal Answer'}
					onClick={props.onClickReveal}
				/>
			) : null}
			{isAnswerScored && detailedText ? (
				<span key="_instructions" className="pick-all-instructions">
					{detailedText}
				</span>
			) : null}
		</div>
	)
}

export default QuestionFooter
