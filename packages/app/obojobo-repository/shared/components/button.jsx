require('./button.scss')

const React = require('react')

const Button = props => (
	<button
		onClick={e => {
			e.preventDefault()
			props.onClick()
		}}
		aria-label={props.ariaLabel}
		className={`repository--button ${props.className || ''}`}
		disabled={props.disabled}
	>
		{props.children}
	</button>
)

module.exports = Button
