import './more-info-button.scss'

import React from 'react'
import uuid from '../util/uuid'

const DEFAULT_LABEL = '?'

class MoreInfoButton extends React.Component {
	static get defaultProps() {
		return {
			label: DEFAULT_LABEL
		}
	}

	constructor() {
		super()

		this.boundOnMouseOver = this.onMouseOver.bind(this)
		this.boundOnMouseOut = this.onMouseOut.bind(this)
		this.boundOnClick = this.onClick.bind(this)
		this.hide = this.hide.bind(this)

		this.state = {
			mode: 'hidden',
			id: uuid() // Used to create a unique DOM ID for aria-labelledby
		}

		this.dialogRef = React.createRef()
	}

	hide() {
		this.setState({ mode: 'hidden' })
	}

	onMouseOver() {
		if (this.state.mode === 'hidden') {
			this.setState({ mode: 'hover' })
		}
	}

	onMouseOut() {
		if (this.state.mode === 'hover') {
			this.hide()
		}
	}

	onClick() {
		if (this.state.mode === 'clicked') {
			this.hide()
		} else {
			this.setState({ mode: 'clicked' })
		}
	}

	componentDidUpdate() {
		if (this.state.mode === 'clicked' && this.dialogRef.current) {
			this.dialogRef.current.focus()
		}
	}

	render() {
		const isShowing = this.state.mode === 'hover' || this.state.mode === 'clicked'

		return (
			<div
				className={`obojobo-draft--components--more-info-button ${
					this.props.label === DEFAULT_LABEL ? 'is-default-label' : 'is-not-default-label'
				} is-mode-${this.state.mode}`}
			>
				<button
					type="button" // Prevents click event when inside a <form>
					onMouseOver={this.boundOnMouseOver}
					onMouseOut={this.boundOnMouseOut}
					onClick={this.boundOnClick}
					aria-label={this.props.ariaLabel || 'More info'}
				>
					{this.props.label}
				</button>
				{isShowing ? (
					<div
						className="info"
						role="dialog"
						tabIndex="-1"
						onBlur={this.hide}
						ref={this.dialogRef}
						aria-labelledby={`obojobo-draft--components--more-info-button--container--${this.state.id}`}
					>
						<div
							id={`obojobo-draft--components--more-info-button--container--${this.state.id}`}
							className="container"
						>
							{this.props.children}
						</div>
					</div>
				) : null}
			</div>
		)
	}
}

export default MoreInfoButton
