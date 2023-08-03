import React from 'react'

const NonEditableChunk = props => (
	<div
		className={`non-editable-chunk${props.className ? ` ${props.className}` : ''}`}
		contentEditable={false}
		data-indent={props.indent || 0}
		{...(props.hangingIndent ? { 'data-hanging-indent': true } : {})}
	>
		{props.children}
	</div>
)

export default NonEditableChunk
