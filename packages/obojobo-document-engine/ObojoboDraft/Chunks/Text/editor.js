import React from 'react'
import Common from 'Common'

import emptyNode from './empty-node.json'
import Icon from './icon'
import Node from './editor-component'
import Line from './components/line/editor-component'
import Schema from './schema'
import Converter from './converter'

import KeyDownUtil from '../../../src/scripts/oboeditor/util/keydown-util'
import splitParent from './changes/split-parent'
import decreaseIndent from './changes/decrease-indent'
import increaseIndent from './changes/increase-indent'
import insertTab from './changes/insert-tab'

const TEXT_NODE = 'ObojoboDraft.Chunks.Text'
const TEXT_LINE_NODE = 'ObojoboDraft.Chunks.Text.TextLine'

const isType = change =>
	change.value.blocks.some(
		block => !!change.value.document.getClosest(block.key, parent => parent.type === TEXT_NODE)
	)

const plugins = {
	onKeyDown(event, change) {
		const isText = isType(change)
		if (!isText) return

		const last = change.value.endBlock

		switch (event.key) {
			case 'Backspace':
			case 'Delete':
				return KeyDownUtil.deleteEmptyParent(event, change, TEXT_NODE)

			case 'Enter':
				// Single Enter
				if (last.text !== '') return

				// Double Enter
				return splitParent(event, change)

			case 'Tab':
				// TAB+SHIFT
				if (event.shiftKey) return decreaseIndent(event, change)

				// TAB+ALT
				if (event.altKey) return increaseIndent(event, change)

				// TAB
				return insertTab(event, change)
		}
	},
	renderNode(props) {
		switch (props.node.type) {
			case TEXT_NODE:
				return <Node {...props} {...props.attributes} />
			case TEXT_LINE_NODE:
				return <Line {...props} {...props.attributes} />
		}
	},
	renderPlaceholder(props) {
		const { node } = props
		if (node.object !== 'block' || node.type !== TEXT_LINE_NODE || node.text !== '') return

		return (
			<span className={'placeholder align-' + node.data.get('align')} contentEditable={false}>
				{'Type Your Text Here'}
			</span>
		)
	},
	schema: Schema
}

Common.Store.registerEditorModel('ObojoboDraft.Chunks.Text', {
	name: 'Text',
	icon: Icon,
	isInsertable: true,
	insertJSON: emptyNode,
	slateToObo: Converter.slateToObo,
	oboToSlate: Converter.oboToSlate,
	plugins
})

const Text = {
	name: TEXT_NODE,
	components: {
		Node,
		Line,
		Icon
	},
	helpers: {
		slateToObo: Converter.slateToObo,
		oboToSlate: Converter.oboToSlate
	},
	json: {
		emptyNode
	},
	plugins
}

export default Text
