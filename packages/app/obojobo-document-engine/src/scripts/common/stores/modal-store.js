import Store from '../flux/store'
import Dispatcher from '../flux/dispatcher'
import focus from '../page/focus'

class ModalStore extends Store {
	constructor() {
		super('modalstore')

		Dispatcher.on('modal:show', payload => {
			this._show(payload.value)
		})

		Dispatcher.on('modal:hide', this._hide.bind(this))
	}

	init() {
		return (this.state = {
			modals: []
		})
	}

	_show(modalItem) {
		this.lastActiveElement = document.activeElement
		this.state.modals.push(modalItem)
		this.triggerChange()
	}

	_hide() {
		this.state.modals.shift()
		this.triggerChange()

		if (this.lastActiveElement && document.body.contains(this.lastActiveElement)) {
			focus(this.lastActiveElement)
		}

		delete this.lastActiveElement
	}

	getState() {
		return this.state
	}

	setState(newState) {
		return (this.state = newState)
	}
}

const modalStore = new ModalStore()
export default modalStore
