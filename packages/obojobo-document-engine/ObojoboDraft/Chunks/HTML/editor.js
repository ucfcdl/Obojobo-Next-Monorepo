import React from 'react'
import Common from 'Common'

import emptyNode from './empty-node.json'
import Icon from './icon'
import Node from './editor-component'
import Schema from './schema'
import Converter from './converter'

const HTML_NODE = 'ObojoboDraft.Chunks.HTML'

const plugins = {
	renderNode(props) {
		switch (props.node.type) {
			case HTML_NODE:
				return <Node {...props} {...props.attributes} />
		}
	},
	onKeyDown(event, change) {
		const isHTML = change.value.blocks.some(block => block.type === HTML_NODE)
		if (!isHTML) return

		switch (event.key) {
			case 'Enter':
				event.preventDefault()
				return change.insertText('\n')

			case 'Tab':
				event.preventDefault()
				return change.insertText('\t')
		}
	},
	schema: Schema
}

Common.Store.registerEditorModel('ObojoboDraft.Chunks.HTML', {
	name: 'HTML',
	icon: Icon,
	isInsertable: true,
	insertJSON: emptyNode,
	slateToObo: Converter.slateToObo,
	oboToSlate: Converter.oboToSlate,
	plugins
})

const HTML = {
	name: HTML_NODE,
	components: {
		Node,
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

export default HTML
