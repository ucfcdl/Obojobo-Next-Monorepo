import './simple-dialog.scss'

import React from 'react'

import ModalUtil from '../../util/modal-util'
import Dialog from './dialog'

class SimpleDialog extends React.Component {
	constructor() {
		super()
		this.boundKeyUp = this.onKeyUp.bind(this)
	}

	componentDidMount() {
		document.addEventListener('keyup', this.boundKeyUp)
	}

	componentWillUnmount() {
		document.removeEventListener('keyup', this.boundKeyUp)
	}

	focusOnFirstElement() {
		if (this.props.focusOnFirstElement) {
			return this.props.focusOnFirstElement()
		}
	}

	onKeyUp(event) {
		if (event.key === 'Enter') {
			this.props.onConfirm()
		}
	}

	render() {
		let buttons
		if (this.props.ok) {
			buttons = [
				{
					value: 'OK',
					onClick: this.props.onConfirm,
					default: true
				}
			]
		} else if (this.props.noOrYes) {
			buttons = [
				{
					value: 'No',
					onClick: this.props.onCancel
				},
				'or',
				{
					value: 'Yes',
					onClick: this.props.onConfirm,
					default: true
				}
			]
		} else if (this.props.yesOrNo) {
			buttons = [
				{
					value: 'Yes',
					onClick: this.props.onConfirm
				},
				'or',
				{
					value: 'No',
					onClick: this.props.onCancel,
					default: true
				}
			]
		} else {
			buttons = [
				{
					value: 'Cancel',
					altAction: true,
					onClick: this.props.onCancel
				},
				{
					value: 'OK',
					onClick: this.props.onConfirm,
					default: true
				}
			]
		}

		return (
			<div className="obojobo-draft--components--modal--simple-dialog">
				<Dialog
					centered
					buttons={buttons}
					title={this.props.title}
					width={this.props.width}
					focusOnFirstElement={this.focusOnFirstElement.bind(this)}
				>
					{this.props.children}
				</Dialog>
			</div>
		)
	}
}

SimpleDialog.defaultProps = {
	ok: false,
	noOrYes: false,
	yesOrNo: false,
	cancelOk: false,
	title: null,
	width: null,
	onCancel() {
		return ModalUtil.hide()
	},
	onConfirm() {
		return ModalUtil.hide()
	}
}

export default SimpleDialog
