import React from 'react'
import isOrNot from 'obojobo-document-engine/src/scripts/common/util/isornot'

import './drop-down-menu.scss'

class DropDownMenu extends React.PureComponent {
	constructor(props) {
		super(props)

		this.state = {
			isOpen: false,
			isFocused: false,
			currentFocus: 0
		}

		this.menu = []
		this.timeOutId = null
		this.onBlurHandler = this.onBlurHandler.bind(this)
		this.onFocusHandler = this.onFocusHandler.bind(this)
		this.onKeyDown = this.onKeyDown.bind(this)
		this.toggleOpen = this.toggleOpen.bind(this)
		this.menuButton = React.createRef()
	}

	componentDidUpdate() {
		// When the menu is open, focus on the current dropdown item
		if (this.state.isOpen) {
			this.menu = this.menu.filter(Boolean)
			this.menu[this.state.currentFocus].focus()
		}
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

	toggleOpen() {
		this.setState(prevState => ({ isOpen: !prevState.isOpen }))
	}

	render() {
		this.menu = []
		return (
			<div
				className={'dropdown ' + isOrNot(this.state.isOpen, 'open')}
				key={this.props.name}
				onBlur={this.onBlurHandler}
				onFocus={this.onFocusHandler}
				onKeyDown={this.onKeyDown}
				ref={this.props.onRef}
				tabIndex={-1}
			>
				<button className="menu-title" onClick={this.toggleOpen} ref={this.menuButton}>
					{this.props.name}
				</button>
				<div className="menu-items">
					{this.props.menu.map((item, index) => {
						switch (item.type) {
							case 'sub-menu':
								return (
									<DropDownMenu
										key={index}
										name={item.name}
										menu={item.menu}
										onRef={item => {
											this.menu.push(item)
										}}
									/>
								)
							case 'toggle-action':
								return (
									<button
										key={index}
										onClick={item.action}
										disabled={item.disabled}
										ref={item => {
											this.menu.push(item)
										}}
									>
										{item.name}
										{item.value ? <span>✔</span> : null}
									</button>
								)
							default:
								return (
									<button
										key={index}
										onClick={item.action}
										disabled={item.disabled}
										ref={item => {
											this.menu.push(item)
										}}
									>
										{item.name}
									</button>
								)
						}
					})}
				</div>
			</div>
		)
	}
}

export default DropDownMenu
