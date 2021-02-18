import './viewer-component.scss'
import './editor-component.scss'

import React, { useCallback } from 'react'
import { ReactEditor } from 'slate-react'
import { Transforms } from 'slate'
import Common from 'obojobo-document-engine/src/scripts/common'
import Node from 'obojobo-document-engine/src/scripts/oboeditor/components/node/editor-component'
import withSlateWrapper from 'obojobo-document-engine/src/scripts/oboeditor/components/node/with-slate-wrapper'

const { Button } = Common.components

const toggleSize = (editor, element) => {
	const width = element.content.width === 'normal' ? 'large' : 'normal'
	const path = ReactEditor.findPath(editor, element)
	Transforms.setNodes(editor, { content: { ...element.content, width } }, { at: path })
}

const returnFocusOnTab = (editor, event) => {
	// Since there is only one button, return on both tab and shift-tab
	if (event.key === 'Tab') {
		event.preventDefault()
		return ReactEditor.focus(editor)
	}
}

const renderButton = (editor, element) => {
	const onClickHandler = useCallback(() => {
		toggleSize(editor, element)
	}, [editor, element])

	const onKeyDownHandler = useCallback(
		event => {
			returnFocusOnTab(editor, event)
		},
		[editor]
	)

	return (
		<div className="buttonbox-box" contentEditable={false}>
			<div className="box-border">
				<Button className="toggle-size" onClick={onClickHandler} onKeyDown={onKeyDownHandler}>
					Toggle Size
				</Button>
			</div>
		</div>
	)
}

const Break = props => (
	<Node {...props}>
		<div
			className={`non-editable-chunk obojobo-draft--chunks--break viewer width-${props.element.content.width}`}
		>
			<hr />
			<span className="invisibleText">{props.children}</span>
			{props.selected ? renderButton(props.editor, props.element) : null}
		</div>
	</Node>
)

export default withSlateWrapper(Break)
