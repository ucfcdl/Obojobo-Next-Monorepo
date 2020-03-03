import './viewer-component.scss'
import './editor-component.scss'

import React from 'react'
import Node from 'obojobo-document-engine/src/scripts/oboeditor/components/node/editor-component'

const HTML = props => {
	return (
		<Node {...props}>
			<div className={'obojobo-draft--chunks--html html-editor viewer pad'}>
				<pre>{props.children}</pre>
			</div>
		</Node>
	)
}

export default HTML
