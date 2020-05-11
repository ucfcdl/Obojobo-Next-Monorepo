import React from 'react'
import Common from 'obojobo-document-engine/src/scripts/common'

import ClipboardUtil from '../../util/clipboard-util'
import APIUtil from '../../../viewer/util/api-util'
import { downloadDocument } from '../../../common/util/download-document'

import DropDownMenu from './drop-down-menu'

const { Prompt } = Common.components.modal
const { Dialog } = Common.components.modal
const { ModalUtil } = Common.util

class FileMenu extends React.PureComponent {
	deleteModule() {
		return APIUtil.deleteDraft(this.props.draftId).then(result => {
			if (result.status === 'ok') {
				window.close()
			}
		})
	}

	copyModule(newTitle) {
		ModalUtil.hide()
		return APIUtil.copyDraft(this.props.draftId, newTitle).then(result => {
			window.open(window.location.origin + '/editor/visual/' + result.value.draftId, '_blank')
		})
	}

	processFileContent(id, content, type) {
		APIUtil.postDraft(
			id,
			content,
			type === 'application/json' ? 'application/json' : 'text/plain'
		).then(() => {
			this.props.reload()
		})
	}

	onFileChange(event) {
		const file = event.target.files[0]

		const reader = new FileReader()
		reader.readAsText(file, 'UTF-8')
		reader.onload = e => {
			this.processFileContent(this.props.draftId, e.target.result, file.type)
		}

		return reader // return for test access
	}

	buildFileSelector() {
		ModalUtil.hide()

		const fileSelector = document.createElement('input')
		fileSelector.setAttribute('type', 'file')
		fileSelector.setAttribute('accept', 'application/JSON, application/XML')

		fileSelector.onchange = this.onFileChange.bind(this)

		fileSelector.click()
	}

	render() {
		const url = window.location.origin + '/view/' + this.props.draftId
		const menu = [
			{
				name: 'Save Module',
				type: 'action',
				action: () => this.props.onSave(this.props.draftId)
			},
			{
				name: 'New',
				type: 'action',
				action: () =>
					APIUtil.createNewDraft().then(result => {
						if (result.status === 'ok') {
							window.open(window.location.origin + '/editor/visual/' + result.value.id, '_blank')
						}
					})
			},
			{
				name: 'Make a copy...',
				type: 'action',
				action: () =>
					ModalUtil.show(
						<Prompt
							title="Copy Module"
							message="Enter the title for the copied module:"
							value={this.props.title + ' - Copy'}
							onConfirm={this.copyModule.bind(this)}
						/>
					)
			},
			{
				name: 'Download',
				type: 'sub-menu',
				menu: [
					{
						name: 'XML Document (.xml)',
						type: 'action',
						action: () => downloadDocument(this.props.draftId, 'xml')
					},
					{
						name: 'JSON Document (.json)',
						type: 'action',
						action: () => downloadDocument(this.props.draftId, 'json')
					}
				]
			},
			{
				name: 'Import from file...',
				type: 'action',
				action: () => {
					const buttons = [
						{
							value: 'Cancel',
							altAction: true,
							onClick: ModalUtil.hide
						},
						{
							value: 'Yes - Choose file...',
							onClick: this.buildFileSelector.bind(this),
							default: true
						}
					]
					ModalUtil.show(
						<Dialog buttons={buttons} title="Import From File">
							Importing replaces the contents of this module. Continue?
						</Dialog>
					)
				}
			},
			{
				name: 'Delete Module...',
				type: 'action',
				action: () => {
					const buttons = [
						{
							value: 'Cancel',
							altAction: true,
							onClick: ModalUtil.hide
						},
						{
							value: 'Delete Now',
							isDangerous: true,
							onClick: this.deleteModule.bind(this),
							default: true
						}
					]
					ModalUtil.show(
						<Dialog buttons={buttons} title="Delete Module">
							Deleting is permanent, continue?
						</Dialog>
					)
				}
			},
			{
				name: 'Copy LTI Link',
				type: 'action',
				action: () => ClipboardUtil.copyToClipboard(url)
			}
		]

		const { isOpen, close, toggleOpen, onMouseEnter } = this.props
		return (
			<div className="visual-editor--drop-down-menu">
				<DropDownMenu
					name="File"
					menu={menu}
					isOpen={isOpen}
					close={close}
					toggleOpen={toggleOpen}
					onMouseEnter={onMouseEnter}
				/>
			</div>
		)
	}
}

export default FileMenu
