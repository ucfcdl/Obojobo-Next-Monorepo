import './viewer-component.scss'
import './editor-component.scss'

import React from 'react'
import Node from 'obojobo-document-engine/src/scripts/oboeditor/components/node/editor-component'
import withSlateWrapper from 'obojobo-document-engine/src/scripts/oboeditor/components/node/with-slate-wrapper'

const Heading = props => {
	const { content } = props.element
	const HTag = `h${content.headingLevel || 1}`

	return (
		<Node {...props}>
			<div className={'text-chunk obojobo-draft--chunks--heading pad'}>
				<HTag>
					<span className={`obo-text align-${content.align}`}>{props.children}</span>
				</HTag>
			</div>
		</Node>
	)
}

export default withSlateWrapper(Heading)
