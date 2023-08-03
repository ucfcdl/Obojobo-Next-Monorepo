import React, { useMemo } from 'react'
import { ReactEditor, useEditor } from 'slate-react'
import { Range, Editor, Transforms, Element } from 'slate'
import FileToolbar from './file-toolbar'
import DropDownMenu from './drop-down-menu'
import FormatMenu from './format-menu'
import { Registry } from '../../../common/registry'

const selectAll = editor => {
	const edges = Editor.edges(editor, [])
	Transforms.select(editor, { focus: edges[0], anchor: edges[1] })
	return ReactEditor.focus(editor)
}

const FileToolbarViewer = props => {
	const { insertableItems, ...filteredProps } = props
	const editor = useEditor()
	const sel = editor.selection

	const hasSelection = sel && Range.isCollapsed(sel)
	const selectionKey = sel ? sel.anchor.path.join() + '-' + sel.focus.path.join() : 0

	const insertMenu = useMemo(() => {
		// If the selected area spans across multiple blocks, the selection is deleted before
		// inserting, colapsing it down to the type of the first block
		// we will need the node object itself as well as the path to it for a future lookup
		const selectedNodeData = (() => {
			if (!hasSelection) return null

			return Editor.nodes(editor, {
				at: Editor.path(editor, sel, { edge: 'start' }),
				mode: 'lowest',
				match: node => Element.isElement(node) && !editor.isInline(node) && !node.subtype
			}).next().value
		})()

		const selectedNode = selectedNodeData?.[0] ?? null
		const registryItem = Registry.getItemForType(selectedNode?.type)

		let insertItemOmissions = []

		if (selectedNode) {
			const nodeParent = Editor.parent(editor, selectedNodeData[1])[0]

			if (nodeParent.type) {
				insertItemOmissions = Registry.getItemForType(nodeParent.type).disallowedChildren
			}
		}

		const insertMenuItems = insertableItems
			.filter(item => item && item.type)
			.filter(item => !insertItemOmissions.includes(item.type))
			.map(item => ({
				name: item.name,
				disabled: !registryItem?.acceptsInserts || false,
				action: () => {
					if (!hasSelection || !selectedNode) return

					if (registryItem?.plugins?.insertItemInto) {
						// custom chunk action
						registryItem.plugins.insertItemInto(editor, item)
					} else {
						// default action
						Transforms.insertNodes(editor, item.cloneBlankNode())
					}

					ReactEditor.focus(editor)
				}
			}))

		return (
			<div className="visual-editor--drop-down-menu">
				<DropDownMenu name="Insert" menu={insertMenuItems} />
			</div>
		)
	}, [selectionKey])

	return (
		<FileToolbar
			{...filteredProps}
			editor={editor}
			selectionKey={selectionKey}
			insertMenu={insertMenu}
			formatMenu={<FormatMenu hasSelection={hasSelection} />}
			selectAll={selectAll}
			isDeletable={hasSelection}
		/>
	)
}

export default FileToolbarViewer
