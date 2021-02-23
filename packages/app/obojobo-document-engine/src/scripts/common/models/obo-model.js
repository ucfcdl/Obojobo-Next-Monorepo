import Backbone from 'backbone'

import uuid from '../util/uuid'
import Dispatcher from '../flux/dispatcher'
import { Registry } from '../registry'
import DOMUtil from '../page/dom-util'
import setProp from '../util/set-prop'

const DefaultAdapter = {
	construct() {
		return null
	},
	clone(clone) {
		return clone
	},
	toJSON(model, json) {
		return json
	},
	toText() {
		return ''
	}
}

class OboModel extends Backbone.Model {
	defaults() {
		return {
			id: null,
			content: {},
			metadata: {},
			index: 0,
			type: ''
		}
	}

	// WARNING - it is not possible to have 2 different documents/modules
	// loaded via OboModel at once. If you need to clear a previous
	// OboModel Tree, call OboModel.clearAll()
	static create(typeOrNameOrJson, attrs = {}) {
		if (typeof typeOrNameOrJson === 'object') {
			const oboModel = OboModel.create(typeOrNameOrJson.type, typeOrNameOrJson)

			if (oboModel) {
				const { children } = typeOrNameOrJson
				if (children) {
					for (const child of Array.from(children)) {
						oboModel.children.add(OboModel.create(child))
					}
				}
			}

			return oboModel
		}

		let item = Registry.getDefaultItemForModelType(typeOrNameOrJson)
		if (!item) {
			item = Registry.getItemForType(typeOrNameOrJson)
		}

		if (!item) {
			return null
		}

		attrs.type = typeOrNameOrJson

		return new OboModel(attrs, item.adapter)
	}

	static clearAll() {
		OboModel.models = {}
	}

	constructor(attrs, adapter = {}) {
		super(attrs)

		this.parent = null
		this.children = new OboModelCollection()
		this.triggers = attrs.content && attrs.content.triggers ? attrs.content.triggers : []
		this.title = attrs.content && attrs.content.title ? attrs.content.title : null

		this.modelState = {
			dirty: false,
			needsUpdate: false,
			editing: false
		}

		if (attrs.id === null || typeof attrs.id === 'undefined') {
			attrs.id = this.createNewLocalId()
		}

		this.adapter = Object.assign(Object.assign({}, DefaultAdapter), adapter)
		this.adapter.construct(this, attrs)

		this.children.on('remove', this.onChildRemove, this)
		this.children.on('add', this.onChildAdd, this)
		this.children.on('reset', this.onChildrenReset, this)

		OboModel.models[this.get('id')] = this
	}

	setStateProp(propName, defaultValue, transformValueFn, allowedValues) {
		const content = this.get('content')
		if (!content) return false

		setProp(this.modelState, content, propName, defaultValue, transformValueFn, allowedValues)

		return true
	}

	getRoot() {
		let root = this
		while (root !== null) {
			if (root.parent) {
				root = root.parent
			} else {
				return root
			}
		}
	}

	processTrigger(type) {
		let index
		const triggersToDelete = []

		for (let trigIndex = 0; trigIndex < this.triggers.length; trigIndex++) {
			const trigger = this.triggers[trigIndex]
			if (trigger.type === type) {
				for (index = 0; index < trigger.actions.length; index++) {
					const action = trigger.actions[index]
					Dispatcher.trigger(action.type, action)
				}

				if (trigger.run && trigger.run === 'once') {
					triggersToDelete.unshift(trigIndex)
				}
			}
		}

		return (() => {
			const result = []
			for (index of Array.from(triggersToDelete)) {
				result.push(this.triggers.splice(index, 1))
			}
			return result
		})()
	}

	onChildRemove(model) {
		model.parent = null
		model.markDirty()

		return delete OboModel.models[model.get('id')]
	}

	onChildAdd(model) {
		model.parent = this
		OboModel.models[model.get('id')] = model
		return model.markDirty()
	}

	onChildrenReset(collection, options) {
		options.previousModels.map(child => (child.parent = null))
	}

	createNewLocalId() {
		return uuid()
	}

	assignNewId() {
		delete OboModel.models[this.get('id')]

		this.set('id', this.createNewLocalId())

		return (OboModel.models[this.get('id')] = this)
	}

	// Returns false and fails to change the ID if the newId already exists
	// Otherwise, sets the new id and deletes the old id
	setId(newId) {
		if (this.get('id') === newId) {
			return true
		}

		if (OboModel.models[newId]) {
			return false
		}

		delete OboModel.models[this.get('id')]

		this.set('id', newId)

		return (OboModel.models[this.get('id')] = this)
	}

	clone(deep = false) {
		const clone = new OboModel(
			{ ...this.attributes, ...{ id: this.createNewLocalId() } },
			this.adapter.constructor
		)
		this.adapter.clone(this, clone)

		if (deep && this.hasChildren()) {
			for (const child of Array.from(this.children.models)) {
				clone.children.add(child.clone(true), { at: clone.children.length })
			}
		}

		return clone
	}

	toJSON() {
		const json = super.toJSON()
		this.adapter.toJSON(this, json)

		json.children = null

		if (this.hasChildren()) {
			json.children = []
			for (const child of Array.from(this.children.models)) {
				json.children.push(child.toJSON())
			}
		}

		return json
	}

	flatJSON() {
		const json = super.toJSON()
		this.adapter.toJSON(this, json)

		json.children = []

		return json
	}

	toText() {
		let text = this.adapter.toText(this)

		for (const child of Array.from(this.children.models)) {
			text += `\n${child.toText()}`
		}

		return text
	}

	revert() {
		const index = this.get('index')
		const id = this.get('id')
		const newModel = new this.constructor({})

		for (const attrName in newModel.attributes) {
			const attr = newModel.attributes[attrName]
			this.set(attrName, attr)
		}

		this.set('index', index)
		this.set('id', id)
		this.modelState = newModel.modelState
		this.children.forEach(child => child.remove())

		return this
	}

	markDirty() {
		this.modelState.dirty = true
		this.modelState.needsUpdate = true
	}

	markForUpdate(markChildren = false) {
		this.modelState.needsUpdate = true

		if (markChildren) {
			return Array.from(this.children.models).map(child => child.markForUpdate())
		}
	}

	markUpdated(markChildren = false) {
		this.modelState.needsUpdate = false

		if (markChildren) {
			return Array.from(this.children.models).map(child => (child.modelState.needsUpdate = false))
		}
	}

	getDomId() {
		return 'obo-' + this.get('id')
	}

	getDomEl() {
		return DOMUtil.getComponentElementById(this.get('id'))
	}

	getComponentClass() {
		return Registry.getItemForType(this.get('type')).componentClass
	}

	hasChildren() {
		return this.children.models.length > 0
	}

	isOrphan() {
		return this.parent === null
	}

	addChildBefore(sibling) {
		if (this.isOrphan()) {
			return
		}

		const children = this.parent.children

		if (children.contains(sibling)) {
			children.remove(sibling)
		}

		return children.add(sibling, { at: this.getIndex() })
	}

	addChildAfter(sibling) {
		if (this.isOrphan()) {
			return
		}

		const children = this.parent.children

		if (children.contains(sibling)) {
			children.remove(sibling)
		}

		return children.add(sibling, { at: this.getIndex() + 1 })
	}

	moveTo(index) {
		if (this.getIndex() === index) {
			return
		}

		const refChunk = this.parent.children.at(index)

		if (index < this.getIndex()) {
			return refChunk.addChildBefore(this)
		} else {
			return refChunk.addChildAfter(this)
		}
	}

	moveToTop() {
		return this.moveTo(0)
	}

	moveToBottom() {
		return this.moveTo(this.parent.children.length - 1)
	}

	prevSibling() {
		if (this.isOrphan() || this.isFirst()) {
			return null
		}
		return this.parent.children.at(this.getIndex() - 1)
	}

	getIndex() {
		if (!this.parent) {
			return 0
		}
		return this.parent.children.models.indexOf(this)
	}

	nextSibling() {
		if (this.isOrphan() || this.isLast()) {
			return null
		}
		return this.parent.children.at(this.parent.children.models.indexOf(this) + 1)
	}

	isFirst() {
		if (this.isOrphan()) {
			return false
		}
		return this.getIndex() === 0
	}

	isLast() {
		if (this.isOrphan()) {
			return false
		}
		return this.getIndex() === this.parent.children.length - 1
	}

	isBefore(otherChunk) {
		if (this.isOrphan()) {
			return false
		}
		return this.getIndex() < otherChunk.getIndex()
	}

	isAfter(otherChunk) {
		if (this.isOrphan()) {
			return false
		}
		return this.getIndex() > otherChunk.getIndex()
	}

	remove() {
		if (!this.isOrphan()) {
			return this.parent.children.remove(this)
		}
	}

	replaceWith(newChunk) {
		if (this.isOrphan() || newChunk === this) {
			return
		}

		this.addChildBefore(newChunk)
		return this.remove()
	}

	getDirectChildrenOfType(type) {
		return this.children.models.filter(c => c.get('type') === type)
	}

	contains(child) {
		while (child !== null) {
			if (child === this) {
				return true
			}

			child = child.parent
		}

		return false
	}

	getParentOfType(type) {
		let model = this.parent
		while (model !== null) {
			if (model.get('type') === type) {
				return model
			}
			model = model.parent
		}

		return null
	}
}

OboModel.getRoot = function() {
	for (const id in OboModel.models) {
		return OboModel.models[id].getRoot()
	}

	return null
}

OboModel.clearAll() // initialize models object

class OboModelCollection extends Backbone.Collection {}

export default OboModel
