import './sub-menu.scss'

import ClipboardUtil from '../util/clipboard-util'
import Common from 'Common'
import EditorStore from '../stores/editor-store'
import EditorUtil from '../util/editor-util'
import React from 'react'

const { Prompt } = Common.components.modal
const { ModalUtil, isOrNot } = Common.util

const { OboModel } = Common.models

class SubMenu extends React.Component {
	constructor(props) {
		super(props)

		this.state = {
			isOpen: false,
			isFocused: false,
			currentFocus: 0
		}

		this.menu = []
		this.timeOutId = null
	}

	deletePage(pageId) {
		EditorUtil.deletePage(pageId)
	}

	showRenamePageModal(page) {
		ModalUtil.show(
			<Prompt
				cancelOk
				title="Rename Page"
				message="Enter the new title for the page:"
				value={page.label}
				onConfirm={this.renamePage.bind(this, page.id)}
			/>
		)
	}

	renamePage(pageId, label) {
		ModalUtil.hide()

		// Fix page titles that are whitespace strings
		if (!/[^\s]/.test(label)) label = null

		EditorUtil.renamePage(pageId, label)
	}

	movePage(pageId, index) {
		EditorUtil.movePage(pageId, index)
	}

	setStartPage(pageId) {
		EditorUtil.setStartPage(pageId)
	}

	componentDidUpdate() {
		// When the menu is open, focus on the current dropdown item
		if (this.state.isOpen) {
			this.menu[this.state.currentFocus].focus()
		}
	}

	onKeyDown(event) {
		switch (event.key) {
			// Open the menu and set the first item as the current focus
			case 'ArrowRight':
				this.setState({ isOpen: true, currentFocus: 0 })
				break

			// Close the menu and return focus to the link item
			case 'ArrowLeft':
				this.setState({ isOpen: false })
				this.linkButton.focus()
				break

			// Move down through the submenu
			case 'ArrowDown':
				this.setState(currentState => ({
					currentFocus: (currentState.currentFocus + 1) % this.menu.length
				}))
				break

			// Move up through the submenu
			case 'ArrowUp':
				this.setState(currentState => ({
					currentFocus: (currentState.currentFocus - 1) % this.menu.length
				}))
				break
		}
	}

	// The timeout gives the blur time to check for child focus
	onBlurHandler() {
		this.timeOutId = setTimeout(() => {
			this.setState({
				isOpen: false
			})
		})
	}

	// If we focused on a child, don't close the sub-menu
	onFocusHandler() {
		clearTimeout(this.timeOutId)
	}

	renderLabel(label) {
		return <span>{label}</span>
	}

	renderLinkButton(label, ariaLabel, refId) {
		return (
			<button
				ref={item => {
					this.linkButton = item
					return refId
				}}
				aria-label={ariaLabel}
			>
				{this.renderLabel(label)}
			</button>
		)
	}

	renderDropDown(item) {
		this.menu = []
		const model = OboModel.models[item.id]
		return (
			<ul className={'dropdown ' + isOrNot(this.state.isOpen, 'open')}>
				<span>{'▼'}</span>
				{model.isFirst() ? null : (
					<li>
						<button
							onClick={() => this.movePage(item.id, model.getIndex() - 1)}
							tabIndex="-1"
							ref={item => {
								this.moveUpRef = item
							}}
						>
							Move Up
						</button>
					</li>
				)}
				{model.isLast() ? null : (
					<li>
						<button
							onClick={() => this.movePage(item.id, model.getIndex() + 1)}
							tabIndex="-1"
							ref={item => {
								this.moveDownRef = item
							}}
						>
							Move Down
						</button>
					</li>
				)}
				<li>
					<button
						onClick={() => this.showRenamePageModal(item)}
						tabIndex="-1"
						ref={item => {
							this.editNameRef = item
						}}
					>
						Edit Name
					</button>
				</li>
				{item.id === EditorStore.state.startingId ? null : (
					<li>
						<button
							onClick={event => {
								event.stopPropagation()
								this.setStartPage(item.id)
							}}
							tabIndex="-1"
							ref={item => {
								this.setStartRef = item
							}}
						>
							Make Start Page
						</button>
					</li>
				)}
				<li>
					<button
						onClick={() => this.deletePage(item.id)}
						tabIndex="-1"
						ref={item => {
							this.deleteRef = item
						}}
					>
						Delete
					</button>
				</li>
				<li>
					<button
						onClick={() => ClipboardUtil.copyToClipboard(item.id)}
						tabIndex="-1"
						ref={item => {
							this.getIdRef = item
						}}
					>
						{'Id: ' + item.id}
					</button>
				</li>
			</ul>
		)
	}

	// This is called after renderDropDown so that the proper ref setup has
	// already occurred
	linkReferences(item) {
		this.menu = []
		if (this.moveUpRef) this.menu.push(this.moveUpRef)
		if (this.moveDownRef) this.menu.push(this.moveDownRef)
		this.menu.push(this.editNameRef)
		if (item.id !== EditorStore.state.startingId) this.menu.push(this.setStartRef)
		this.menu.push(this.deleteRef)
		this.menu.push(this.getIdRef)
	}

	render() {
		const { index, isSelected, list } = this.props
		const item = list[index]
		const isFirstInList = !list[index - 1]
		const isLastInList = !list[index + 1]

		const className =
			'editor--editor-nav--submenu link' +
			isOrNot(isSelected, 'selected') +
			isOrNot(item.flags.assessment, 'assessment') +
			isOrNot(isFirstInList, 'first-in-list') +
			isOrNot(isLastInList, 'last-in-list')

		let ariaLabel = item.label
		if (item.contentType) {
			ariaLabel = item.contentType + ': ' + ariaLabel
		}
		if (isSelected) {
			ariaLabel = 'Currently on ' + ariaLabel
		} else {
			ariaLabel = 'Go to ' + ariaLabel
		}

		return (
			<li
				onClick={this.props.onClick}
				className={className}
				onBlur={() => this.onBlurHandler()}
				onFocus={() => this.onFocusHandler()}
				onKeyDown={event => this.onKeyDown(event)}
			>
				{this.renderLinkButton(item.label, ariaLabel, item.id)}
				{this.renderDropDown(item)}
				{this.linkReferences(item)}
			</li>
		)
	}
}

export default SubMenu
