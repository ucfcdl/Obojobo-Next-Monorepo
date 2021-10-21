import { Editor } from 'slate'
jest.mock('slate-react')

import BasicMarks from 'obojobo-document-engine/src/scripts/oboeditor/components/marks/basic-marks'

const BOLD_MARK = 'b'
const ITALIC_MARK = 'i'
const STRIKE_MARK = 'del'
const QUOTE_MARK = 'q'
const MONOSPACE_MARK = 'monospace'
const LATEX_MARK = '_latex'

describe('BasicMarks', () => {
	test('onKeyDown does not toggle mark if wrong key is pressed', () => {
		const editor = {
			toggleMark: jest.fn()
		}

		BasicMarks.plugins.onKeyDown({ key: 'q' }, editor, jest.fn())

		expect(editor.toggleMark).not.toHaveBeenCalled()
	})

	test('onKeyDown does not toggle mark if shift key is pressed', () => {
		const editor = {
			toggleMark: jest.fn()
		}

		BasicMarks.plugins.onKeyDown({ key: 'q', shiftKey: true }, editor, jest.fn())

		expect(editor.toggleMark).not.toHaveBeenCalled()
	})

	test('onKeyDown does not toggle mark if CTRL/CMD + wrong key is pressed', () => {
		const editor = {
			toggleMark: jest.fn()
		}

		BasicMarks.plugins.onKeyDown({ ctrlKey: true, key: 'f' }, editor, jest.fn())

		expect(editor.toggleMark).not.toHaveBeenCalled()
	})

	test('onKeyDown toggles marks if CTRL/CMD + key is pressed', () => {
		const editor = {
			toggleMark: jest.fn()
		}
		const mockEvent = {
			ctrlKey: true,
			key: 'b',
			preventDefault: jest.fn()
		}

		BasicMarks.plugins.onKeyDown(mockEvent, editor, jest.fn())
		expect(editor.toggleMark).toHaveBeenCalledWith(BOLD_MARK)

		mockEvent.key = 'i'
		BasicMarks.plugins.onKeyDown(mockEvent, editor, jest.fn())
		expect(editor.toggleMark).toHaveBeenCalledWith(ITALIC_MARK)

		mockEvent.key = 'd'
		BasicMarks.plugins.onKeyDown(mockEvent, editor, jest.fn())
		expect(editor.toggleMark).toHaveBeenCalledWith(STRIKE_MARK)

		mockEvent.key = "'"
		BasicMarks.plugins.onKeyDown(mockEvent, editor, jest.fn())
		expect(editor.toggleMark).toHaveBeenCalledWith(QUOTE_MARK)

		mockEvent.key = 'm'
		BasicMarks.plugins.onKeyDown(mockEvent, editor, jest.fn())
		expect(editor.toggleMark).toHaveBeenCalledWith(MONOSPACE_MARK)

		mockEvent.key = '/'
		BasicMarks.plugins.onKeyDown(mockEvent, editor, jest.fn())
		expect(editor.toggleMark).toHaveBeenCalledWith(LATEX_MARK)
	})

	test('renderLeaf displays expected style', () => {
		expect(
			BasicMarks.plugins.renderLeaf({
				leaf: { b: true },
				children: {
					props: 'mockChildProps'
				}
			})
		).toMatchInlineSnapshot(`
		Object {
		  "children": <strong>
		    Object {
		      "props": "mockChildProps",
		    }
		  </strong>,
		  "leaf": Object {
		    "b": true,
		  },
		}
		`)

		expect(
			BasicMarks.plugins.renderLeaf({
				leaf: { i: true },
				children: {
					props: 'mockChildProps'
				}
			})
		).toMatchInlineSnapshot(`
		Object {
		  "children": <em>
		    Object {
		      "props": "mockChildProps",
		    }
		  </em>,
		  "leaf": Object {
		    "i": true,
		  },
		}
		`)

		expect(
			BasicMarks.plugins.renderLeaf({
				leaf: { del: true },
				children: {
					props: 'mockChildProps'
				}
			})
		).toMatchInlineSnapshot(`
		Object {
		  "children": <del>
		    Object {
		      "props": "mockChildProps",
		    }
		  </del>,
		  "leaf": Object {
		    "del": true,
		  },
		}
		`)

		expect(
			BasicMarks.plugins.renderLeaf({
				leaf: { q: true },
				children: {
					props: 'mockChildProps'
				}
			})
		).toMatchInlineSnapshot(`
		Object {
		  "children": <q>
		    Object {
		      "props": "mockChildProps",
		    }
		  </q>,
		  "leaf": Object {
		    "q": true,
		  },
		}
		`)

		expect(
			BasicMarks.plugins.renderLeaf({
				leaf: { monospace: true },
				children: {
					props: 'mockChildProps'
				}
			})
		).toMatchInlineSnapshot(`
		Object {
		  "children": <code>
		    Object {
		      "props": "mockChildProps",
		    }
		  </code>,
		  "leaf": Object {
		    "monospace": true,
		  },
		}
		`)

		expect(
			BasicMarks.plugins.renderLeaf({
				leaf: { _latex: true },
				children: {
					props: 'mockChildProps'
				}
			})
		).toMatchInlineSnapshot(`
		Object {
		  "children": <div
		    className="latex-editor "
		    spellCheck={false}
		  >
		    Object {
		      "props": "mockChildProps",
		    }
		  </div>,
		  "leaf": Object {
		    "_latex": true,
		  },
		}
		`)
	})

	test('renderLeaf does nothing', () => {
		expect(
			BasicMarks.plugins.renderLeaf({
				leaf: {},
				children: {
					props: 'mockChildProps'
				}
			})
		).toMatchInlineSnapshot(`
		Object {
		  "children": Object {
		    "props": "mockChildProps",
		  },
		  "leaf": Object {},
		}
	`)
	})

	test('renderLeaf does not style HTML nodes', () => {
		expect(
			BasicMarks.plugins.renderLeaf({
				leaf: { b: true },
				children: {
					props: {
						parent: {
							type: 'ObojoboDraft.Chunks.HTML'
						}
					}
				}
			})
		).toMatchInlineSnapshot(`
		Object {
		  "children": Object {
		    "props": Object {
		      "parent": Object {
		        "type": "ObojoboDraft.Chunks.HTML",
		      },
		    },
		  },
		  "leaf": Object {
		    "b": true,
		  },
		}
		`)
	})

	test('toggleMarks removes links', () => {
		jest.spyOn(Editor, 'removeMark').mockReturnValue(true)

		const editor = {
			removeMark: jest.fn(),
			addMark: jest.fn(),
			children: [{ text: 'mockText', b: true }],
			selection: {
				anchor: { path: [0], offset: 1 },
				focus: { path: [0], offset: 1 }
			}
		}

		BasicMarks.plugins.commands.toggleMark(editor, BOLD_MARK)

		expect(Editor.removeMark).toHaveBeenCalled()
	})

	test('toggleMarks adds links', () => {
		jest.spyOn(Editor, 'addMark').mockReturnValue(true)
		const editor = {
			removeMark: jest.fn(),
			addMark: jest.fn(),
			children: [{ text: 'mockText' }],
			selection: {
				anchor: { path: [0], offset: 1 },
				focus: { path: [0], offset: 1 }
			}
		}

		BasicMarks.plugins.commands.toggleMark(editor, BOLD_MARK)

		expect(Editor.addMark).toHaveBeenCalled()
	})

	test('the action in each mark calls editor.toggleMark', () => {
		const editor = {
			focus: jest.fn()
		}
		editor.toggleMark = jest.fn().mockReturnValue(editor)

		BasicMarks.marks.forEach(mark => {
			mark.action(editor)
		})

		expect(editor.toggleMark).toHaveBeenCalledTimes(6)
	})
})
