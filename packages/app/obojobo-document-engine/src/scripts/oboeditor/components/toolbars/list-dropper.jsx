import './list-dropper.scss'

import React from 'react'
import { Editor, Element } from 'slate'
import isOrNot from 'obojobo-document-engine/src/scripts/common/util/isornot'
import OrderedListIcon from '../../assets/ordered-list-icon'
import UnorderedListIcon from '../../assets/unordered-list-icon'

const LIST_NODE = 'ObojoboDraft.Chunks.List'
const TEXT_NODE = 'ObojoboDraft.Chunks.Text'

class ListDropper extends React.Component {
	constructor(props) {
		super(props)
		this.state = {
			isOpen: false,
			currentFocus: 0
		}

		this.timeOutId = null
		this.menu = []
		this.toggleLevelSelect = this.toggleLevelSelect.bind(this)
		this.onBlurHandler = this.onBlurHandler.bind(this)
		this.onFocusHandler = this.onFocusHandler.bind(this)
		this.onKeyDown = this.onKeyDown.bind(this)
		this.menuButton = React.createRef()
		this.toggleBullet = this.toggleBullet.bind(this)
	}

	componentDidUpdate() {
		// When the menu is open, focus on the current dropdown item
		if (this.state.isOpen) {
			this.menu = this.menu.filter(Boolean)
			this.menu[this.state.currentFocus].focus()
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

	onKeyDown(event) {
		this.menu = this.menu.filter(Boolean)
		if (this.state.isOpen) event.stopPropagation()

		switch (event.key) {
			// Open the menu and set the first item as the current focus
			case 'ArrowRight':
				this.setState({ isOpen: true, currentFocus: 0 })
				event.stopPropagation()
				break

			// Close the menu and return focus to the link item
			case 'ArrowLeft':
				this.setState({ isOpen: false })
				this.menuButton.current.focus()
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
					currentFocus: (currentState.currentFocus + this.menu.length - 1) % this.menu.length
				}))
				break
		}
	}

	toggleLevelSelect() {
		this.setState(state => {
			return { isOpen: !state.isOpen }
		})
	}

	changeBullet(bulletStyle) {
		this.props.editor.changeToType(LIST_NODE, { type: this.props.type, bulletStyle })
	}

	toggleBullet() {
		const nodes = Array.from(
			Editor.nodes(this.props.editor, {
				mode: 'lowest',
				match: node => Element.isElement(node) && !this.props.editor.isInline(node) && !node.subtype
			})
		)
		const isList = nodes.every(([block]) => block.type === LIST_NODE)

		if (!isList) {
			return this.props.editor.changeToType(LIST_NODE, {
				type: this.props.type,
				bulletStyle: this.props.defaultStyle
			})
		}

		// Once we know they are all lists, we can check if the lists are the same type
		// as the list we are changing to
		const isSameType = nodes.every(([block]) => block.content.listStyles.type === this.props.type)
		if (!isSameType) {
			return this.props.editor.changeToType(LIST_NODE, {
				type: this.props.type,
				bulletStyle: this.props.defaultStyle
			})
		}

		this.props.editor.changeToType(TEXT_NODE)
	}

	render() {
		const isMac = navigator.platform.indexOf('Mac') !== -1
		// Decide whether or not to use the mac shortcut
		// Note - users can spoof their appVersion, but anyone who is tech-savvy enough
		// to do that is probably tech-savvy enough to know whether they use CTRL or ⌘
		// for keyboard shortcuts
		const hotKey = isMac ? '⌘+' : 'Ctrl+'
		const shortcut = this.props.shortcut ? '\n' + hotKey + this.props.shortcut : ''

		return (
			<div
				className={'list-dropper'}
				contentEditable={false}
				onBlur={this.onBlurHandler}
				onFocus={this.onFocusHandler}
				onKeyDown={this.onKeyDown}
			>
				<button
					className="icon"
					onClick={this.toggleBullet}
					ref={this.menuButton}
					title={this.props.type + ' list' + shortcut}
					aria-label={this.props.type + ' list'}
				>
					{this.props.type === 'ordered' ? <OrderedListIcon /> : <UnorderedListIcon />}
				</button>
				<button
					className={'dropdown ' + isOrNot(this.state.isOpen, 'open')}
					onClick={this.toggleLevelSelect}
					ref={this.menuButton}
					aria-label={'Open ' + this.props.type + ' list type menu'}
				>
					{'⌃'}
				</button>
				<div className={'list-dropper-menu ' + isOrNot(this.state.isOpen, 'open')}>
					{this.props.bullets.map(bullet => (
						<button
							key={bullet.bulletStyle}
							onClick={this.changeBullet.bind(this, bullet.bulletStyle)}
							ref={item => {
								this.menu.push(item)
							}}
						>
							{bullet.display}
						</button>
					))}
				</div>
			</div>
		)
	}
}

export default ListDropper
