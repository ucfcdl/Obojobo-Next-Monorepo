import React from 'react'

import emptyNode from './empty-node.json'
import Icon from './icon'
import EditorComponent from './editor-component'
import Converter from './converter'

const IFRAME_NODE = 'ObojoboDraft.Chunks.IFrame'

const IFrame = {
	name: IFRAME_NODE,
	menuLabel: 'IFrame',
	icon: Icon,
	isInsertable: true,
	isContent: true,
	helpers: Converter,
	json: {
		emptyNode
	},
	plugins: {
		// Editor Plugins - These get attached to the editor object an override it's default functions
		// They may affect multiple nodes simultaneously
		isVoid(element, editor, next) {
			if (element.type === IFRAME_NODE) return true

			return next(element)
		},
		// Editable Plugins - These are used by the PageEditor component to augment React functions
		// They affect individual nodes independently of one another
		renderNode(props) {
			return <EditorComponent {...props} {...props.attributes} />
		}
	}
}

export default IFrame
