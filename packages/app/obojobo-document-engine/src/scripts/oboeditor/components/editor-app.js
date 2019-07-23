import '../../../scss/main.scss'
// uses viewer css for styling
import '../../../scripts/viewer/components/viewer-app.scss'
import 'obojobo-modules-module/viewer-component.scss'

import APIUtil from 'obojobo-document-engine/src/scripts/viewer/util/api-util'
import Common from 'obojobo-document-engine/src/scripts/common'
import EditorNav from './editor-nav'
import EditorStore from '../stores/editor-store'
import { KeyUtils } from 'slate'
import PageEditor from './page-editor'
import React from 'react'
import generateId from '../generate-ids'

const { ModalContainer } = Common.components
const { ModalUtil } = Common.util
const { ModalStore } = Common.stores
const { OboModel } = Common.models

class EditorApp extends React.Component {
	constructor(props) {
		super(props)

		this.state = {
			model: null,
			editorState: null,
			modalState: null,
			navTargetId: null,
			loading: true,
			draftId: null,
			draft: null
		}

		// Make Slate nodes generate with UUIDs
		KeyUtils.setGenerator(generateId)

		this.onEditorStoreChange = () => this.setState({ editorState: EditorStore.getState() })
		this.onModalStoreChange = () => this.setState({ modalState: ModalStore.getState() })

		// === SET UP DATA STORES ===
		EditorStore.onChange(this.onEditorStoreChange)
		ModalStore.onChange(this.onModalStoreChange)
	}

	componentDidMount() {
		const urlTokens = document.location.pathname.split('/')
		const draftId = urlTokens[2] ? urlTokens[2] : null

		return APIUtil.getFullDraft(draftId)
			.then(response => {
				ModalStore.init()

				if (response.status === 'error') throw response.value
				return response
			})
			.then(({ value: draftModel }) => {
				const obomodel = OboModel.create(draftModel)
				EditorStore.init(obomodel, draftModel.content.start, this.props.settings, window.location.pathname)

				return this.setState({
					modalState: ModalStore.getState(),
					editorState: EditorStore.getState(),
					draftId,
					draft: draftModel,
					model: obomodel,
					loading: false
				})
			})
			.catch(err => {
				// eslint-disable-next-line no-console
				console.error(err)
				return this.setState({ requestStatus: 'invalid', requestError: err })
			})
	}

	componentWillUnmount() {
		EditorStore.offChange(this.onEditorStoreChange)
		ModalStore.offChange(this.onModalStoreChange)
	}

	render() {
		if (this.state.requestStatus === 'invalid') {
			return (
				<div className="viewer--viewer-app--visit-error">
					<h1>Error</h1>
					<h2>{this.state.requestError.type}</h2>
					<div>{this.state.requestError.message}</div>
				</div>
			)
		}

		if (this.state.loading) return <p>Loading</p>

		const modalItem = ModalUtil.getCurrentModal(this.state.modalState)
		return (
			<div
				className={
					'viewer--viewer-app editor--editor-app is-loaded is-unlocked-nav is-open-nav is-enabled-nav is-focus-state-inactive'
				}
			>
				<EditorNav
					navState={this.state.editorState}
					model={this.state.model}
					draftId={this.state.draftId}
				/>
				<div className={'component obojobo-draft--modules--module'} role="main" data-obo-component>
					<PageEditor
						page={this.state.editorState.currentModel}
						context={this.state.editorState.context}
						model={this.state.model}
						draft={this.state.draft}
						draftId={this.state.draftId}
					/>
				</div>
				{modalItem && modalItem.component ? (
					<ModalContainer>{modalItem.component}</ModalContainer>
				) : null}
			</div>
		)
	}
}

export default EditorApp
