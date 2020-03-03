import withoutUndefined from './util/without-undefined'

let items
let defaults
let variableHandlers

const noop = () => {}
let memoInsertable

class _Registry {
	init() {
		items = new Map()
		defaults = new Map()
		variableHandlers = new Map()
	}

	loadDependency(url, onLoadCallback = () => {}) {
		const type = url.substr(url.lastIndexOf('.') + 1)

		switch (type) {
			case 'js': {
				const el = document.createElement('script')
				el.setAttribute('src', url)
				el.onload = onLoadCallback
				document.head.appendChild(el)
				break
			}

			case 'css': {
				const el = document.createElement('link')
				el.setAttribute('rel', 'stylesheet')
				el.setAttribute('href', url)
				document.head.appendChild(el)
				onLoadCallback()
				break
			}
		}

		return this
	}

	// convenience method for editor nodes to register
	registerEditorModel(EditorNode) {
		// Since registerModel sets defaults we want to remove any
		// undefined values (Object.assign won't overwrite object
		// values that are undefined, only ones that don't exist
		// in the object)

		this.registerModel(
			EditorNode.name,
			withoutUndefined({
				name: EditorNode.menuLabel,
				icon: EditorNode.icon,
				isInsertable: EditorNode.isInsertable,
				insertJSON: EditorNode.json && EditorNode.json.emptyNode,
				slateToObo: EditorNode.helpers && EditorNode.helpers.slateToObo,
				oboToSlate: EditorNode.helpers && EditorNode.helpers.oboToSlate,
				plugins: EditorNode.plugins,
				getPasteNode: EditorNode.getPasteNode,
				getNavItem: EditorNode.getNavItem,
				supportsChildren: EditorNode.supportsChildren || false,
				ignore: EditorNode.ignore || false
			})
		)
	}

	cloneBlankNode(templateObject) {
		return JSON.parse(JSON.stringify(templateObject))
	}

	registerModel(className, opts = {}) {
		const item = items.get(className)

		// combine opts with existing item if set
		if (item) opts = Object.assign(opts, item)

		// combine defaults with opts (and existing item)
		opts = Object.assign(
			{
				type: null,
				default: false,
				insertItem: null,
				componentClass: null,
				commandHandler: null,
				variables: {},
				templateObject: '',
				init: noop,
				name: '',
				icon: null,
				isInsertable: false,
				slateToObo: null,
				oboToSlate: null,
				plugins: null,
				getPasteNode: node => node,
				supportsChildren: false
			},
			opts
		)

		// bind cloneBlankNode to the combined templateObject value
		opts.cloneBlankNode = this.cloneBlankNode.bind(this, opts.insertJSON)

		// save/update the final combined options on items
		items.set(className, opts)

		// if combined ops has default set to true, store it in the default for this type
		if (opts.default) {
			defaults.set(opts.type, className)
		}

		// run init if it was set
		opts.init()

		// store variable handlers
		for (const variable in opts.variables) {
			const cb = opts.variables[variable]
			variableHandlers.set(variable, cb)
		}

		// return this for chaining
		return this
	}

	getDefaultItemForModelType(modelType) {
		const type = defaults.get(modelType)
		if (!type) {
			return null
		}
		return items.get(type)
	}

	getItemForType(type) {
		return items.get(type)
	}

	getItems(callback) {
		return callback(items)
	}

	getTextForVariable(variable, model, viewerState) {
		const cb = variableHandlers.get(variable)
		if (!cb) {
			return null
		}

		return cb.call(null, model, viewerState)
	}

	get insertableItems() {
		if (!memoInsertable) {
			memoInsertable = Array.from(items.values()).filter(item => item.isInsertable)
		}
		return memoInsertable
	}
}

const Registry = new _Registry()

Registry.init()
export { Registry }
