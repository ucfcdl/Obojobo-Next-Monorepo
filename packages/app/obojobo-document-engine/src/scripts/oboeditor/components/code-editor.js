import './code-editor.scss'
import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/monokai.css'
import 'codemirror/addon/fold/foldgutter.css'

import React, { Suspense } from 'react'
import EditorUtil from '../../../scripts/oboeditor/util/editor-util'
import FileToolbar from './toolbars/file-toolbar'
import EditorTitleInput from './editor-title-input'

const CodeMirror = React.lazy(() =>
	import(/* webpackChunkName: "code-mirror" */ './code-mirror-bundle')
)

const XML_MODE = 'xml'
const JSON_MODE = 'json'

class CodeEditor extends React.Component {
	constructor(props) {
		super(props)

		const title = EditorUtil.getTitleFromString(props.initialCode, props.mode)

		this.state = {
			code: props.initialCode,
			title,
			saveState: 'saveSuccessful',
			editor: null,
			options: {
				lineNumbers: true,
				mode: this.getCodeMirrorMode(props.mode),
				matchTags: true,
				foldGutter: true,
				lineWrapping: true,
				indentWithTabs: true,
				tabSize: 4,
				indentUnit: 4,
				gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
				theme: 'monokai'
			}
		}

		this.onBeforeChange = this.onBeforeChange.bind(this)
		this.saveAndGetTitleFromCode = this.saveAndGetTitleFromCode.bind(this)
		this.reload = this.reload.bind(this)
		this.checkIfSaved = this.checkIfSaved.bind(this)
		this.onKeyDown = this.onKeyDown.bind(this)
		this.saveAndSetNewTitleInCode = this.saveAndSetNewTitleInCode.bind(this)

		this.setEditor = this.setEditor.bind(this)
	}

	componentDidMount() {
		// Setup unload to prompt user before closing
		window.addEventListener('beforeunload', this.checkIfSaved)
	}

	componentWillUnmount() {
		window.removeEventListener('beforeunload', this.checkIfSaved)
	}

	checkIfSaved(event) {
		if (this.state.saveState !== 'saveSuccessful') {
			event.returnValue = true
			return true // Returning true will cause browser to ask user to confirm leaving page
		}
		//eslint-disable-next-line
		return undefined // Returning undefined will allow browser to close normally
	}

	onBeforeChange(editor, data, code) {
		this.setState({ code, saveState: '' })
	}

	setTitleInCode(code, mode, title) {
		switch (mode) {
			case JSON_MODE:
				return EditorUtil.setModuleTitleInJSON(code, title)

			case XML_MODE:
				return EditorUtil.setModuleTitleInXML(code, title)
		}
	}

	saveAndSetNewTitleInCode(newTitle) {
		const { mode, draftId } = this.props
		const newCode = this.setTitleInCode(this.state.code, mode, newTitle)

		this.setState({
			title: newTitle,
			code: newCode
		})

		return this.sendSave(draftId, newCode, mode)
	}

	reload() {
		window.removeEventListener('beforeunload', this.checkIfSaved)
		location.reload()
	}

	//TARGET
	saveAndGetTitleFromCode() {
		// Update the title in the File Toolbar
		const title = EditorUtil.getTitleFromString(this.state.code, this.props.mode)
		this.setState({ title })

		return this.sendSave(this.props.draftId, this.state.code, this.props.mode)
	}

	sendSave(draftId, code, mode) {
		this.setState({ saveState: 'saving' })
		return this.props.saveDraft(draftId, code, mode).then(isSaved => {
			this.setState({ saveState: isSaved ? 'saveSuccessful' : 'saveFailed' })
		})
	}

	// Makes CodeMirror commands match Slate commands
	convertCodeMirrorToEditor(codeMirror) {
		const editor = codeMirror
		editor.selectAll = () => {
			const lastInfo = editor.lineInfo(editor.lastLine())
			editor.setSelection(
				{ line: editor.firstLine(), ch: 0 },
				{ line: lastInfo.line, ch: lastInfo.text.length }
			)
			return editor
		}
		editor.focus = () => editor
		editor.deleteFragment = () => {
			editor.deleteH(1, 'char')
			return editor
		}
		return editor
	}

	getCodeMirrorMode(mode) {
		switch (mode) {
			case XML_MODE:
				return 'text/xml'
			case JSON_MODE:
				return 'application/json'
		}
	}

	onKeyDown(event) {
		if (!this.state.editor) return

		if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault()
			this.saveAndGetTitleFromCode()
		}
	}

	setEditor(editor) {
		return this.setState({ editor: this.convertCodeMirrorToEditor(editor) })
	}

	render() {
		return (
			<div className={'component editor--code-editor'} onKeyDown={this.onKeyDown}>
				<div className="draft-toolbars">
					<EditorTitleInput title={this.state.title} renameModule={this.saveAndSetNewTitleInCode} />
					{this.state.editor ? (
						<FileToolbar
							editor={this.state.editor}
							title={this.state.title}
							draftId={this.props.draftId}
							switchMode={this.props.switchMode}
							onSave={this.saveAndGetTitleFromCode}
							saveState={this.state.saveState}
							mode={this.props.mode}
						/>
					) : null}
				</div>
				<Suspense fallback={<div>Loading...</div>}>
					<CodeMirror
						options={this.state.options}
						value={this.state.code}
						onBeforeChange={this.onBeforeChange}
						editorDidMount={this.setEditor}
					/>
				</Suspense>
			</div>
		)
	}
}

export default CodeEditor
