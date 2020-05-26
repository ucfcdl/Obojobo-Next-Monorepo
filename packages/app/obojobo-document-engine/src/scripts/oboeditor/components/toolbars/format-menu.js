import React from 'react'
import { Range } from 'slate'

import DropDownMenu from './drop-down-menu'

import BasicMarks from '../marks/basic-marks'
import LinkMark from '../marks/link-mark'
import ScriptMarks from '../marks/script-marks'
import AlignMarks from '../marks/align-marks'
import IndentMarks from '../marks/indent-marks'

const TEXT_NODE = 'ObojoboDraft.Chunks.Text'
const HEADING_NODE = 'ObojoboDraft.Chunks.Heading'
const CODE_NODE = 'ObojoboDraft.Chunks.Code'
// const LIST_NODE = 'ObojoboDraft.Chunks.List'

const textMarks = [...BasicMarks.marks, ...LinkMark.marks, ...ScriptMarks.marks]
const alignIndentMarks = [...AlignMarks.marks, ...IndentMarks.marks]

const FormatMenu = props => {
	const textMenu = {
		name: 'Text',
		type: 'sub-menu',
		menu: textMarks.map(mark => ({
			name: mark.name,
			type: 'action',
			action: () => mark.action(props.editor),
			disabled: props.editor.selection && Range.isCollapsed(props.editor.selection)
		}))
	}

	const paragraphMenu = {
		name: 'Paragraph styles',
		type: 'sub-menu',
		menu: [
			{
				name: 'Normal Text',
				type: 'action',
				action: () => props.editor.changeToType(TEXT_NODE)
			},
			{
				name: 'Heading 1',
				type: 'action',
				action: () => props.editor.changeToType(HEADING_NODE, { headingLevel: 1 })
			},
			{
				name: 'Heading 2',
				type: 'action',
				action: () => props.editor.changeToType(HEADING_NODE, { headingLevel: 2 })
			},
			{
				name: 'Heading 3',
				type: 'action',
				action: () => props.editor.changeToType(HEADING_NODE, { headingLevel: 3 })
			},
			{
				name: 'Heading 4',
				type: 'action',
				action: () => props.editor.changeToType(HEADING_NODE, { headingLevel: 4 })
			},
			{
				name: 'Heading 5',
				type: 'action',
				action: () => props.editor.changeToType(HEADING_NODE, { headingLevel: 5 })
			},
			{
				name: 'Heading 6',
				type: 'action',
				action: () => props.editor.changeToType(HEADING_NODE, { headingLevel: 6 })
			},
			{
				name: 'Code',
				type: 'action',
				action: () => props.editor.changeToType(CODE_NODE)
			}
		]
	}

	const alignMenu = {
		name: 'Align & indent',
		type: 'sub-menu',
		menu: alignIndentMarks.map(mark => ({
			name: mark.name,
			type: 'action',
			action: () => mark.action(props.editor)
		}))
	}

	// @TODO: Removed until Lists are completed
	// const bulletsMenu = {
	// 	name: 'Bullets & numbering',
	// 	type: 'sub-menu',
	// 	menu: [
	// 		{
	// 			name: 'Bulleted List',
	// 			type: 'sub-menu',
	// 			menu: [
	// 				{
	// 					name: '● Disc',
	// 					type: 'action',
	// 					action: () =>
	// 						props.editor.changeToType(LIST_NODE, { type: 'unordered', bulletStyle: 'disc' })
	// 				},
	// 				{
	// 					name: '○ Circle',
	// 					type: 'action',
	// 					action: () =>
	// 						props.editor.changeToType(LIST_NODE, { type: 'unordered', bulletStyle: 'circle' })
	// 				},
	// 				{
	// 					name: '■ Square',
	// 					type: 'action',
	// 					action: () =>
	// 						props.editor.changeToType(LIST_NODE, { type: 'unordered', bulletStyle: 'square' })
	// 				}
	// 			]
	// 		},
	// 		{
	// 			name: 'Numbered List',
	// 			type: 'sub-menu',
	// 			menu: [
	// 				{
	// 					name: 'Numbers',
	// 					type: 'action',
	// 					action: () =>
	// 						props.editor.changeToType(LIST_NODE, { type: 'ordered', bulletStyle: 'decimal' })
	// 				},
	// 				{
	// 					name: 'Lowercase Alphabet',
	// 					type: 'action',
	// 					action: () =>
	// 						props.editor.changeToType(LIST_NODE, { type: 'ordered', bulletStyle: 'lower-alpha' })
	// 				},
	// 				{
	// 					name: 'Lowercase Roman Numerals',
	// 					type: 'action',
	// 					action: () =>
	// 						props.editor.changeToType(LIST_NODE, { type: 'ordered', bulletStyle: 'lower-roman' })
	// 				},
	// 				{
	// 					name: 'Uppercase Alphabet',
	// 					type: 'action',
	// 					action: () =>
	// 						props.editor.changeToType(LIST_NODE, { type: 'ordered', bulletStyle: 'upper-alpha' })
	// 				},
	// 				{
	// 					name: 'Uppercase Roman Numerals',
	// 					type: 'action',
	// 					action: () =>
	// 						props.editor.changeToType(LIST_NODE, { type: 'ordered', bulletStyle: 'upper-roman' })
	// 				}
	// 			]
	// 		}
	// 	]
	// }

	// @TODO: Bullets menu removed until lists are complete
	const menu = [textMenu, paragraphMenu, alignMenu /*bulletsMenu*/]

	const { isOpen, close, toggleOpen, onMouseEnter } = props
	return (
		<div className="visual-editor--drop-down-menu">
			<DropDownMenu
				name="Format"
				menu={menu}
				isOpen={isOpen}
				close={close}
				toggleOpen={toggleOpen}
				onMouseEnter={onMouseEnter}
			/>
		</div>
	)
}

export default FormatMenu
