import './visual-editor.scss'

import EditorUtil from '../util/editor-util'
import AlignMarks from './marks/align-marks'
import BasicMarks from './marks/basic-marks'
import ColorMarks from './marks/color-marks'
import ClipboardPlugin from '../plugins/clipboard-plugin'
import Common from 'obojobo-document-engine/src/scripts/common'
import Component from './node/editor'
import ContentToolbar from './toolbars/content-toolbar'
import EditorStore from '../stores/editor-store'
import FileToolbarViewer from './toolbars/file-toolbar-viewer'
import FormatPlugin from '../plugins/format-plugin'
import IndentMarks from './marks/indent-marks'
import LinkMark from './marks/link-mark'
import OboNodePlugin from '../plugins/obonode-plugin'
import ScriptMarks from './marks/script-marks'
import EditorNav from './navigation/editor-nav'
import isOrNot from 'obojobo-document-engine/src/scripts/common/util/isornot'
import VisualEditorErrorBoundry from './visual-editor-error-boundry'
import EditorTitleInput from './editor-title-input'
import HoveringPreview from './hovering-preview'

const { OboModel } = Common.models
const { Button } = Common.components
const { Dispatcher } = Common.flux

const CONTENT_NODE = 'ObojoboDraft.Sections.Content'
const ASSESSMENT_NODE = 'ObojoboDraft.Sections.Assessment'

import React from 'react'
import { createEditor, Editor, Element, Transforms, Range } from 'slate'
import { Slate, Editable, withReact, ReactEditor } from 'slate-react'
import { withHistory } from 'slate-history'

// This file overwrites some Slate methods to fix weird bugs in the Slate system
// It should be deleted when the Slate bugs are remedied
import '../overwrite-bug-fixes'
import ObjectiveProvider from './objectives/objective-provider'

class VisualEditor extends React.Component {
	constructor(props) {
		super(props)
		this.assessment = Common.Registry.getItemForType(ASSESSMENT_NODE)

		const json = this.importFromJSON()

		this.addObjective = objective => {
			this.setState({ objectives: this.state.objectives.concat(objective) })
		}

		this.removeObjective = objectiveId => {
			this.setState({
				objectives: this.state.objectives.filter(o => o.objectiveId !== objectiveId)
			})
		}

		this.updateObjective = (objectiveId, objectiveLabel, description) => {
			this.setState({
				objectives: this.state.objectives.map(objective => {
					if (objective.objectiveId === objectiveId) {
						return {
							...objective,
							objectiveLabel,
							description
						}
					}
					return objective
				})
			})
		}

		this.state = {
			value: json,
			saveState: 'saveSuccessful',
			lastSaved: null,
			elapsed: 0,
			unsavedChanges: false, 
			editable: json && json.length >= 1 && !json[0].text,
			showPlaceholders: true,
			contentRect: null,
			objectives: this.props.model?.objectives ?? [],
			addObjective: this.addObjective,
			removeObjective: this.removeObjective,
			updateObjective: this.updateObjective,
			intervalId: null,
		}

		this.pageEditorContainerRef = React.createRef()
		this.editorRef = React.createRef()
		this.onChange = this.onChange.bind(this)
		this.exportToJSON = this.exportToJSON.bind(this)
		this.saveModule = this.saveModule.bind(this)
		this.reload = this.reload.bind(this)
		this.checkIfSaved = this.checkIfSaved.bind(this)
		this.toggleEditable = this.toggleEditable.bind(this)
		this.exportCurrentToJSON = this.exportCurrentToJSON.bind(this)
		this.markUnsaved = this.markUnsaved.bind(this)
		this.onKeyDownGlobal = this.onKeyDownGlobal.bind(this)
		this.onKeyDown = this.onKeyDown.bind(this)
		this.decorate = this.decorate.bind(this)
		this.renderLeaf = this.renderLeaf.bind(this)
		this.renameModule = this.renameModule.bind(this)
		this.onResized = this.onResized.bind(this)
		this.renderElement = this.renderElement.bind(this)
		this.setEditorFocus = this.setEditorFocus.bind(this)
		this.onClick = this.onClick.bind(this)
		this.hasInvalidFields = this.hasInvalidFields.bind(this)
		this.formatJSON = this.formatJSON.bind(this)
		this.saveModuleToLocalStorage = this.saveModuleToLocalStorage.bind(this)

		this.editor = this.withPlugins(withHistory(withReact(createEditor())))
		this.editor.toggleEditable = this.toggleEditable
		this.editor.markUnsaved = this.markUnsaved
	}

	toggleEditable(editable) {
		return this.setState({ editable })
	}

	markUnsaved() {
		return this.setState({ saveState: '' })
	}

	// All plugins are passed the following parameters:
	// Any parameters that the default method is passed
	// The editor
	// The default method
	addPlugin(editor, plugin) {
		const { normalizeNode, isVoid, insertData, apply } = editor
		if (plugin.normalizeNode) {
			editor.normalizeNode = entry => plugin.normalizeNode(entry, editor, normalizeNode)
		}

		if (plugin.isVoid) {
			editor.isVoid = element => plugin.isVoid(element, editor, isVoid)
		}

		if (plugin.isInline) {
			editor.isInline = element => plugin.isInline(element, editor, isVoid)
		}

		if (plugin.insertData) {
			editor.insertData = data => plugin.insertData(data, editor, insertData)
		}

		if (plugin.commands) {
			for (const [name, funct] of Object.entries(plugin.commands)) {
				editor[name] = funct.bind(this, editor)
			}
		}

		if (plugin.apply) {
			editor.apply = op => plugin.apply(op, editor, apply)
		}

		return editor
	}

	withPlugins(editor) {
		const nodePlugins = Common.Registry.getItems(this.convertItemsToArray)
			.map(item => item.plugins)
			.filter(item => item)

		const markPlugins = [
			ColorMarks.plugins,
			BasicMarks.plugins,
			LinkMark.plugins,
			ScriptMarks.plugins,
			AlignMarks.plugins,
			IndentMarks.plugins
		]

		this.globalPlugins = [...markPlugins, ClipboardPlugin, FormatPlugin, OboNodePlugin]

		// Plugins are listed in order of priority
		// The plugins list is reversed after building because the editor functions
		// are built from the bottom up to the top
		this.plugins = [...nodePlugins, ...this.globalPlugins].reverse()

		this.renderLeafPlugins = this.plugins.filter(plugins => plugins.renderLeaf)

		return this.plugins.reduce(this.addPlugin, editor)
	}

	convertItemsToArray(items) {
		return Array.from(items.values())
	}

	updateElapsed() {
		if (this.state.lastSaved === null) return {...this.state.lastSaved}
		const duration =  Math.floor((Date.now() - this.state.lastSaved) / (60 * 1000))
		this.setState({...this.state, elapsed: duration})
	}

	componentDidMount() {
		Dispatcher.on('modal:show', () => {
			this.toggleEditable(false)
		})
		Dispatcher.on('modal:hide', () => {
			this.toggleEditable(true)
		})
		// Setup unload to prompt user before closing
		window.addEventListener('beforeunload', this.checkIfSaved)
		// Setup global keydown to listen to all global keys
		window.addEventListener('keydown', this.onKeyDownGlobal)

		const intervalId = setInterval(() => {
			this.saveModuleToLocalStorage()
			this.updateElapsed()
		},
		10000)
		this.setState({ ...this.state, intervalId })

		// Set keyboard focus to the editor
		Transforms.select(this.editor, Editor.start(this.editor, []))
		this.setEditorFocus()
		this.setupResizeObserver()
	}

	setupResizeObserver() {
		if (
			!window.ResizeObserver ||
			!window.ResizeObserver.prototype ||
			!window.ResizeObserver.prototype.observe ||
			!window.ResizeObserver.prototype.disconnect
		) {
			return false
		}

		this.resizeObserver = new ResizeObserver(this.onResized)
		this.resizeObserver.observe(this.pageEditorContainerRef.current)

		return true
	}

	componentWillUnmount() {
		window.removeEventListener('beforeunload', this.checkIfSaved)
		window.removeEventListener('keydown', this.onKeyDownGlobal)
		if (this.resizeObserver) this.resizeObserver.disconnect()
		clearInterval(this.state.intervalId)
	}

	checkIfSaved(event) {
		if (this.props.readOnly) {
			//eslint-disable-next-line
			return undefined // Returning undefined will allow browser to close normally
		}

		if (this.hasInvalidFields()) {
			//eslint-disable-next-line
			return undefined
		}

		// have to change value before save state is unsuccessful or do it in the already existing if
		if (this.state.saveState !== 'saveSuccessful') {	
			event.returnValue = true
			return true // Returning true will cause browser to ask user to confirm leaving page
		}


		//eslint-disable-next-line
		return undefined
	}

	onKeyDownGlobal(event) {
		const ctrlOrMetaKey = event.ctrlKey || event.metaKey

		if (event.key === 's' && ctrlOrMetaKey) {
			event.preventDefault()
			return this.saveModule(this.props.draftId)
		}

		if (event.key === 'y' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault()
			return this.editor.redo()
		}

		if (event.key === 'Escape') {
			event.preventDefault()
			return ReactEditor.blur(this.editor)
		}

		// Open top insert menu: - and _ account for users potentially using the shift key
		if ((event.key === '-' || event.key === '_') && ctrlOrMetaKey && event.shiftKey) {
			event.preventDefault()
			// Prevent keyboard stealing by locking the editor to readonly
			this.editor.toggleEditable(false)

			// Get the first, leafmost Obojobo node
			// This allows for things to be inserted inside of nested nodes like Questions
			const [nodeEntry] = Editor.nodes(this.editor, {
				at: Range.start(this.editor.selection),
				match: n => Element.isElement(n) && !n.subtype,
				mode: 'lowest'
			})

			// Change the node so that the top insert menu is open
			return Transforms.setNodes(
				this.editor,
				{ open: 'top' },
				{
					at: nodeEntry[1]
				}
			)
		}

		// Open bottom insert menu: = and + account for users potentially using the shift key
		if ((event.key === '=' || event.key === '+') && ctrlOrMetaKey && event.shiftKey) {
			event.preventDefault()
			// Prevent keyboard stealing by locking the editor to readonly
			this.editor.toggleEditable(false)

			// Get the first, leafmost Obojobo node
			// This allows for things to be inserted inside of nested nodes like Questions
			const [nodeEntry] = Editor.nodes(this.editor, {
				at: Range.end(this.editor.selection),
				match: n => Element.isElement(n) && !n.subtype,
				mode: 'lowest',
				reverse: true
			})

			// Change the node so that the top insert menu is open
			return Transforms.setNodes(
				this.editor,
				{ open: 'bottom' },
				{
					at: nodeEntry[1]
				}
			)
		}

		// Open chunk settings dialog
		if ((event.key === 'i' || event.key === 'I') && ctrlOrMetaKey && event.shiftKey) {
			event.preventDefault()
			// Prevent keyboard stealing by locking the editor to readonly
			this.editor.toggleEditable(false)

			// Get the first, leafmost Obojobo node
			// This allows for things to be inserted inside of nested nodes like Questions
			const [nodeEntry] = Editor.nodes(this.editor, {
				at: Range.start(this.editor.selection),
				match: n => Element.isElement(n) && !n.subtype,
				mode: 'lowest'
			})

			// Change the node so that the more info box is open
			return Transforms.setNodes(
				this.editor,
				{ open: 'info' },
				{
					at: nodeEntry[1]
				}
			)
		}
	}

	onChange(value) {
		// Save the previous selection in case the editor is unfocused
		// This mostly happens with MoreInfoBoxes and void nodes
		if (this.editor.selection) this.editor.prevSelection = this.editor.selection

		this.setState({ value })
		this.markUnsaved()
	}

	onResized(event) {
		this.setState({
			contentRect: event.contentRect
		})
	}

	// Methods that handle movement between pages
	componentDidUpdate(prevProps, prevState) {
		// Do nothing when updating state from empty page
		if (!prevProps.page && !this.props.page) {
			return
		}

		// If updating from an existing page to no page, set the user alert message
		if (prevProps.page && !this.props.page) {
			return this.setState({
				value: [{ text: 'No content available, create a page to start editing' }],
				editable: false
			})
		}

		// If updating from no page to an existing page, load the new page into the editor
		if (!prevProps.page && this.props.page) {
			this.editor.selection = null
			this.editor.prevSelection = null
			return this.setState({ value: this.importFromJSON(), editable: true }, () => {
				Transforms.select(this.editor, Editor.start(this.editor, []))
				this.setEditorFocus()
			})
		}

		// Both page and previous page are garunteed to not be null here
		// Save changes and update value when switching pages
		if (prevProps.page.id !== this.props.page.id) {
			this.editor.selection = null
			this.editor.prevSelection = null
			if (OboModel.models[prevProps.page.id]) {
				this.exportToJSON(prevProps.page, prevState.value)
			}
			return this.setState({ value: this.importFromJSON(), editable: true }, () => {
				Transforms.select(this.editor, Editor.start(this.editor, []))
				this.setEditorFocus()
			})
		}
	}

	renameModule(label) {
		EditorUtil.renameModule(this.props.model.id, label)
		this.saveModule(this.props.draftId)
	}

	// Checks all input and select fields to see if any have false validity
	hasInvalidFields() {
		const inputFields = document.querySelectorAll('input,select')

		for (const field of Array.from(inputFields)) {
			field.blur()
			if (field.reportValidity() === false) {
				return true
			}
		}

		return false
	}

	formatJSON() {
		if (this.props.readOnly) {
			return
		}

		// Check validity of all input and select elements
		if (this.hasInvalidFields()) {
			const message = 'Cannot save this module while errors are present'
			window.alert(message) //eslint-disable-line no-alert
			return
		}

		this.exportCurrentToJSON()
		const json = this.props.model.flatJSON()
		json.content.start = EditorStore.state.startingId
		json.content.objectives = this.state.objectives

		// deal with content
		this.props.model.children.forEach(child => {
			let contentJSON = {}

			switch (child.get('type')) {
				case CONTENT_NODE:
					contentJSON = child.flatJSON()

					for (const item of Array.from(child.children.models)) {
						contentJSON.children.push({
							id: item.get('id'),
							type: item.get('type'),
							content: item.get('content'),
							children: item.get('children')
						})
					}
					break

				case ASSESSMENT_NODE:
					contentJSON.id = child.get('id')
					contentJSON.type = child.get('type')
					contentJSON.children = child.get('children')
					contentJSON.content = child.get('content')
					break
			}
			json.children.push(contentJSON)
		})

		return json
	}

	saveModule(draftId) {
		const json = this.formatJSON()
		this.setState({ saveState: 'saving' })

		return this.props.saveDraft(draftId, JSON.stringify(json)).then(isSaved => {
			if (isSaved) {
				if (this.state.saveState === 'saving') {
					this.setState({...this.state, saveState: 'saveSuccessful', lastSaved: Date.now()})
				}
			} else {
				this.setState({ saveState: 'saveFailed' })
			}
		})
	}

	saveModuleToLocalStorage() {
		const json = this.formatJSON()
		this.props.saveToLocalStorage(json)
	}

	exportToJSON(page, value) {
		if (page === null) return

		if (page.get('type') === ASSESSMENT_NODE) {
			const json = this.assessment.slateToObo(value[0])
			page.set('children', json.children)
			const childrenModels = json.children.map(newChild => OboModel.create(newChild))
			page.children.reset(childrenModels)
			page.set('content', json.content)
			return json
		} else {
			// Build page wrapper
			const json = {}
			json.children = []

			value.forEach(child => {
				const oboChild = Component.helpers.slateToObo(child)
				json.children.push(oboChild)
			})

			page.set('children', json.children)
			const childrenModels = json.children.map(newChild => OboModel.create(newChild))
			page.children.reset(childrenModels)

			return json
		}
	}

	// convenience method to prevent rerendring nav and duplicate code
	exportCurrentToJSON() {
		this.exportToJSON(this.props.page, this.state.value)
	}

	importFromJSON(existingJSON = null) {
		if (!this.props.page) {
			// if page is empty, exit
			return [{ text: 'No content available, create a page to start editing' }]
		}

		const json = existingJSON ?? this.props.page.toJSON()

		if (json.type === ASSESSMENT_NODE) {
			return [this.assessment.oboToSlate(this.props.page)]
		} else {
			const children = json.children.map(child => Component.helpers.oboToSlate(child))
			return children
		}
	}

	// All the 'plugin' methods that allow the obonodes to extend the default functionality
	onKeyDown(event) {
		for (const plugin of this.globalPlugins) {
			if (plugin.onKeyDown) plugin.onKeyDown(event, this.editor)
			if (event.defaultPrevented) return
		}

		// If none of the global plugins caught the key event,
		// Get each component (non-subtype) node that is selected,
		// and run keydown on each
		// The event will always run on every selected node, but
		// if one node does something special, it will prevent the
		// default Slate action from occurring on any selected node
		const list = Array.from(
			Editor.nodes(this.editor, {
				mode: 'lowest',
				match: node => Element.isElement(node) && !this.editor.isInline(node) && !node.subtype
			})
		)

		for (const entry of list) {
			const item = Common.Registry.getItemForType(entry[0].type)
			if (item && item.plugins.onKeyDown) {
				item.plugins.onKeyDown(entry, this.editor, event)
			}
		}

		// This fix breaks the default behavior when moving up inside an element. Needs to be reevaluated.
		/*****
		// Handle ArrowUp from a node - this is default behavior
		// in Chrome and Safari but not Firefox
		if (event.key === 'ArrowUp' && !event.defaultPrevented) {
			event.preventDefault()

			const currentNode = this.editor.selection.anchor.path[0]

			// Break out if already at top node
			if (currentNode === 0) return

			const aboveNode = currentNode - 1
			const numChildrenAbove = this.editor.children[aboveNode].children.length

			let abovePath = [aboveNode]

			// If entering a node with multiple children (a table),
			// go to the last child (bottom row)
			if (numChildrenAbove > 1) {
				abovePath = [aboveNode, numChildrenAbove - 1]
			}

			const focus = Editor.start(this.editor, abovePath)
			const anchor = Editor.start(this.editor, abovePath)

			Transforms.setSelection(this.editor, {
				focus,
				anchor
			})
		}
		*****/
	}

	// Generates any necessary decorations, such as place holders
	decorate(entry) {
		const item = Common.Registry.getItemForType(entry[0].type)
		if (item && item.plugins.decorate) {
			return item.plugins.decorate(entry, this.editor)
		}

		return []
	}

	reload() {
		window.removeEventListener('beforeunload', this.checkIfSaved)
		location.reload()
	}

	// All the render methods that allow the editor to display properly
	renderLeaf(props) {
		props = this.renderLeafPlugins.reduce((props, plugin) => plugin.renderLeaf(props), props)
		const { attributes, children, leaf } = props

		if (leaf.placeholder) {
			return (
				<span {...props} {...attributes}>
					<span contentEditable={false} data-placeholder={leaf.placeholder} />
					{children}
				</span>
			)
		}

		return <span {...attributes}>{children}</span>
	}

	renderElement(props) {
		if (props.element.type === 'a') return LinkMark.plugins.renderNode(props)

		const item = Common.Registry.getItemForType(props.element.type)
		if (item) {
			return item.plugins.renderNode(props)
		}
	}

	setEditorFocus() {
		ReactEditor.focus(this.editor)
	}

	onClick(event) {
		/*
			As for Slate 0.57.2, triple-click causes selection to bleed into the node below which causes focus to jump down when typing
			The following solution detects when bleeding happends (focus.offset === 0) and reduces by 1
			We can disregard this when Slate fixes the problem
		*/
		if (event.detail === 3) {
			const { focus } = this.editor.selection
			if (focus.offset === 0) {
				Transforms.move(this.editor, { distance: 1, unit: 'offset', reverse: true, edge: 'end' })
			}
		}
	}


	render() {
		const className =
			'editor--page-editor ' +
			isOrNot(this.state.showPlaceholders, 'show-placeholders') +
			isOrNot(this.props.readOnly, 'read-only')
	
		//check document engine for confirmation dialog/modal
		return (
			<div className={className} ref={this.pageEditorContainerRef}>
				<Slate editor={this.editor} value={this.state.value} onChange={this.onChange}>
					<HoveringPreview pageEditorContainerRef={this.pageEditorContainerRef} />
					{this.props.readOnly ? null : (
						<div className="draft-toolbars">
							<EditorTitleInput title={this.props.model.title} renameModule={this.renameModule} />
							<Button className="skip-nav" onClick={this.setEditorFocus}>
								Skip to Editor
							</Button>
							{this.state.lastSaved ? <span className='lastSaved'>{this.state.elapsed < 1 ? 'Last saved < 1m ago' : `Last saved ${this.state.elapsed}m ago`}</span> : <></>}
							<FileToolbarViewer
								title={this.props.model.title}
								draftId={this.props.draftId}
								accessLevel={this.props.draft.accessLevel}
								onSave={this.saveModule}
								reload={this.reload}
								switchMode={this.props.switchMode}
								saveState={this.state.saveState}
								mode={'visual'}
								insertableItems={this.props.insertableItems}
								togglePlaceholders={this.togglePlaceholders}
								showPlaceholders={this.state.showPlaceholders}
							/>
							<ContentToolbar editor={this.editor} value={this.state.value} />
						</div>
					)}
					<ObjectiveProvider state={this.state}>
						<EditorNav
							navState={this.props.navState}
							model={this.props.model}
							draftId={this.props.draftId}
							savePage={this.exportCurrentToJSON}
							markUnsaved={this.markUnsaved}
						/>

						<div className="component obojobo-draft--modules--module" role="main">
							<VisualEditorErrorBoundry editorRef={this.editor}>
								<Editable
									className="obojobo-draft--pages--page"
									renderElement={this.renderElement}
									renderLeaf={this.renderLeaf}
									decorate={this.decorate}
									readOnly={!this.state.editable || this.props.readOnly}
									onKeyDown={this.onKeyDown}
									onCut={this.onCut}
									onClick={this.onClick}
								/>
							</VisualEditorErrorBoundry>
						</div>
					</ObjectiveProvider>
				</Slate>
			</div>
		)
	}
}

export default VisualEditor
