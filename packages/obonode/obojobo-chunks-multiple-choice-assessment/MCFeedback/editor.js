import React from 'react'
import Common from 'obojobo-document-engine/src/scripts/common'

import Node from './editor-component'
import Schema from './schema'
import Converter from './converter'

const MCFEEDBACK_NODE = 'ObojoboDraft.Chunks.MCAssessment.MCFeedback'

const plugins = {
	renderNode(props, editor, next) {
		switch (props.node.type) {
			case MCFEEDBACK_NODE:
				return <Node {...props} {...props.attributes} />
			default:
				return next()
		}
	},
	schema: Schema
}

Common.Registry.registerModel('ObojoboDraft.Chunks.MCAssessment.MCFeedback', {
	name: 'Multiple Choice Feedback',
	isInsertable: false,
	slateToObo: Converter.slateToObo,
	oboToSlate: Converter.oboToSlate,
	supportsChildren: true,
	plugins
})

const MCFeedback = {
	components: {
		Node
	},
	helpers: {
		slateToObo: Converter.slateToObo,
		oboToSlate: Converter.oboToSlate
	},
	plugins
}

export default MCFeedback
