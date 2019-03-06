import React from 'react'
import Common from 'Common'

import emptyNode from './empty-node.json'
import Icon from './icon'
import Node from './editor-component'
import Level from './components/level/editor-component'
import Line from './components/line/editor-component'
import Schema from './schema'
import Converter from './converter'

import onBackspace from './changes/on-backspace'
import insertText from './changes/insert-text'
import unwrapLevel from './changes/unwrap-level'
import wrapLevel from './changes/wrap-level'

const LIST_NODE = 'ObojoboDraft.Chunks.List'
const LIST_LINE_NODE = 'ObojoboDraft.Chunks.List.Line'
const LIST_LEVEL_NODE = 'ObojoboDraft.Chunks.List.Level'

const isType = editor => {
	return editor.value.blocks.some(block => {
		return !!editor.value.document.getClosest(block.key, parent => {
			return parent.type === LIST_NODE
		})
	})
}

const plugins = {
	onKeyDown(event, editor, next) {
		// See if any of the selected nodes have a LIST_NODE parent
		const isLine = isType(editor)
		if (!isLine) return next()

		switch (event.key) {
			case 'Backspace':
			case 'Delete':
				return onBackspace(event, editor, next)

			case 'Enter':
				// Text lines will be changed to list lines by the schema unless
				// they are at the end of the list
				return insertText(event, editor, next)

			case 'Tab':
				// TAB+SHIFT
				if (event.shiftKey) return wrapLevel(event, editor, next)

				// TAB
				return unwrapLevel(event, editor, next)

			default:
				return next()
		}
	},
	renderNode(props, editor, next) {
		switch (props.node.type) {
			case LIST_NODE:
				return <Node {...props} {...props.attributes} />
			case LIST_LINE_NODE:
				return <Line {...props} {...props.attributes} />
			case LIST_LEVEL_NODE:
				return <Level {...props} {...props.attributes} />
			default:
				return next()
		}
	},
	renderPlaceholder(props, editor, next) {
		const { node } = props
		if (node.object !== 'block' || node.type !== LIST_LINE_NODE || node.text !== '') return next()

		return (
			<span className={'placeholder align-' + node.data.get('align')} contentEditable={false}>
				{'Type Your Text Here'}
			</span>
		)
	},
	normalizeNode(node, editor, next) {
		if (node.object !== 'block') return next()
		if (node.type !== LIST_NODE && node.type !== LIST_LEVEL_NODE) return next()
		if (node.nodes.size <= 1) return next()

		// Checks children for two consecutive list levels
		// If consecutive levels are found, return the second one so it can be
		// merged into its previous sibling
		const invalids = node.nodes
			.map((child, i) => {
				const nextNode = node.nodes.get(i + 1)
				if (child.type !== LIST_LEVEL_NODE || !nextNode || nextNode.type !== LIST_LEVEL_NODE) {
					return false
				}
				return nextNode
			})
			.filter(Boolean)

		if (invalids.size === 0) return next()

		return editor => {
			return editor.withoutNormalizing(e => {
				invalids.forEach(n => {
					e.mergeNodeByKey(n.key)
				})
			})
		}
	},
	schema: Schema
}

Common.Store.registerEditorModel('ObojoboDraft.Chunks.List', {
	name: 'List',
	icon: Icon,
	isInsertable: true,
	insertJSON: emptyNode,
	slateToObo: Converter.slateToObo,
	oboToSlate: Converter.oboToSlate,
	plugins
})

const List = {
	name: LIST_NODE,
	components: {
		Node,
		Level,
		Line,
		Icon
	},
	helpers: {
		isType,
		slateToObo: Converter.slateToObo,
		oboToSlate: Converter.oboToSlate
	},
	json: {
		emptyNode
	},
	plugins
}

export default List
