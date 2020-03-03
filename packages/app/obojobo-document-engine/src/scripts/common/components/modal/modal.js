import './modal.scss'

import React from 'react'
import DeleteButton from '../delete-button'
import ModalUtil from '../../util/modal-util'

class Modal extends React.Component {
	constructor() {
		super()
		this.boundKeyUp = this.onKeyUp.bind(this)
		this.deleteButtonRef = React.createRef()
		this.onTabTrapFocus = this.onTabTrapFocus.bind(this)
	}

	componentDidMount() {
		document.addEventListener('keyup', this.boundKeyUp)
	}

	componentWillUnmount() {
		document.removeEventListener('keyup', this.boundKeyUp)
	}

	onKeyUp(event) {
		if (!this.props.preventEsc && event.keyCode === 27) {
			//ESC
			if (this.props.onClose) {
				this.props.onClose()
			} else {
				ModalUtil.hide()
			}
		}
	}

	onTabTrapFocus() {
		if (this.props.onClose) {
			return this.deleteButtonRef.current.focus()
		}

		if (this.props.focusOnFirstElement) {
			return this.props.focusOnFirstElement()
		}
	}

	render() {
		return (
			<div
				className={
					'obojobo-draft--components--modal--modal' +
					(this.props.className ? ' ' + this.props.className : '')
				}
				role="dialog"
				aria-labelledby="obojobo-draft--components--modal--modal--content"
			>
				<input className="first-tab" type="text" onFocus={this.onTabTrapFocus} />
				{this.props.onClose ? (
					<DeleteButton ref={this.deleteButtonRef} onClick={this.props.onClose} />
				) : null}
				<div className="content" id="obojobo-draft--components--modal--modal--content">
					{this.props.children}
				</div>
				<input className="last-tab" type="text" onFocus={this.onTabTrapFocus} />
			</div>
		)
	}
}

export default Modal
