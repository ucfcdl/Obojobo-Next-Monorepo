import { Text, Editor, Transforms, Range, Path, Element, Point, Node } from 'slate'

const TEXT_NODE = 'ObojoboDraft.Chunks.Text'
const TEXT_LINE_NODE = 'ObojoboDraft.Chunks.Text.TextLine'

const KeyDownUtil = {
	deleteNodeContents: (event, editor, entry, deleteForward) => {
		const [, nodePath] = entry
		const nodeRange = Editor.range(editor, nodePath)
		// Get only the Element children of the current node that are in the current selection
		const list = Array.from(
			Editor.nodes(editor, {
				at: Range.intersection(editor.selection, nodeRange),
				match: child => Element.isElement(child) && !editor.isInline(child),
				mode: 'lowest'
			})
		)

		// If both ends of the selection are outside the node, simply delete the table
		const [selStart, selEnd] = Range.edges(editor.selection)
		const [nodeStart, nodeEnd] = Range.edges(nodeRange)
		if (Point.isBefore(selStart, nodeStart) && Point.isAfter(selEnd, nodeEnd)) {
			return
		}

		const [, startPath] = list[0]
		const [, endPath] = list[list.length - 1]

		// If a cursor is collapsed, do nothing at start/end based on delete direction
		if (Range.isCollapsed(editor.selection)) {
			if (!deleteForward && editor.selection.anchor.offset === 0) {
				event.preventDefault()
				return
			}
			if (deleteForward && Point.equals(editor.selection.anchor, Editor.end(editor, startPath))) {
				event.preventDefault()
				return
			}
			return
		}

		// Deletion within a single node works as normal
		if (Path.equals(startPath, endPath)) return

		// Deletion across nodes
		event.preventDefault()

		// For each child in the selection, clear the selected text
		for (const [, path] of list) {
			const childRange = Editor.range(editor, path)
			Transforms.delete(editor, { at: Range.intersection(editor.selection, childRange) })
		}

		Transforms.collapse(editor, { edge: deleteForward ? 'end' : 'start' })
	},
	isDeepEmpty(editor, node) {
		if (editor.isVoid(node)) return false
		if (Text.isText(node)) return node.text === ''
		return (
			Editor.isEmpty(editor, node) ||
			(node.children.length === 1 && KeyDownUtil.isDeepEmpty(editor, node.children[0]))
		)
	},
	deleteEmptyParent: (event, editor, [node, path], deleteForward) => {
		// Only delete the node if the selection is collapsed and the node is empty
		if (Range.isCollapsed(editor.selection) && KeyDownUtil.isDeepEmpty(editor, node)) {
			event.preventDefault()
			Transforms.removeNodes(editor, { at: path })

			// By default, the cursor moves to the end of the item before a deleted node
			// after the deletion has occured.  If we are deleting forward, we move it
			// ahead by one, so that it is at the start of the item after the deleted node
			if (deleteForward) Transforms.move(editor)
		}
	},
	breakToText: (event, editor) => {
		if (event.isDefaultPrevented()) return
		event.preventDefault()

		const selectionStart = Editor.start(editor, editor.selection)
		const selectionEnd = Editor.end(editor, editor.selection)
		const nodeEnd = Node.parent(editor, selectionEnd.path)

		const endPath = [...selectionEnd.path]
		endPath[endPath.length - 1] = nodeEnd.children.length - 1
		const endPoint = Editor.end(editor, [...endPath])

		const textRange = {
			anchor: selectionEnd,
			focus: endPoint
		}
		const deleteRange = {
			anchor: selectionStart,
			focus: endPoint
		}
		const newTexts = Node.fragment(editor, textRange)
		const newNode = {
			type: TEXT_NODE,
			content: { triggers: [] },
			children: [
				{
					type: TEXT_NODE,
					subtype: TEXT_LINE_NODE,
					content: { indent: 0, align: 'left' },
					children: [...newTexts[0].children]
				}
			]
		}
		Transforms.insertNodes(editor, newNode, {
			at: deleteRange
		})

		// Move the cursor to the beginning of the duplicated (now text) node
		Transforms.move(editor, { distance: 1, unit: 'offset' })
	}
}

export default KeyDownUtil
