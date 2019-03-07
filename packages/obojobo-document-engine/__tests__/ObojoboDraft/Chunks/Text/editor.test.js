import { CHILD_REQUIRED, CHILD_TYPE_INVALID } from 'slate-schema-violations'

jest.mock('src/scripts/oboeditor/util/text-util')

import Text from 'ObojoboDraft/Chunks/Text/editor'
const TEXT_NODE = 'ObojoboDraft.Chunks.Text'
const TEXT_LINE_NODE = 'ObojoboDraft.Chunks.Text.TextLine'

describe('Text editor', () => {
	test('plugins.renderNode renders text when passed', () => {
		const props = {
			node: {
				type: TEXT_NODE,
				data: {
					get: () => {
						return {}
					}
				}
			}
		}

		expect(Text.plugins.renderNode(props)).toMatchSnapshot()
	})

	test('plugins.renderNode renders a line when passed', () => {
		const props = {
			attributes: { dummy: 'dummyData' },
			node: {
				type: TEXT_LINE_NODE,
				data: {
					get: () => {
						return {}
					}
				}
			}
		}

		expect(Text.plugins.renderNode(props)).toMatchSnapshot()
	})

	test('plugins.renderPlaceholder exits when not relevent', () => {
		expect(
			Text.plugins.renderPlaceholder({
				node: {
					object: 'text'
				}
			})
		).toMatchSnapshot()

		expect(
			Text.plugins.renderPlaceholder({
				node: {
					object: 'block',
					type: 'mockType'
				}
			})
		).toMatchSnapshot()

		expect(
			Text.plugins.renderPlaceholder({
				node: {
					object: 'block',
					type: TEXT_LINE_NODE,
					text: 'Some text'
				}
			})
		).toMatchSnapshot()
	})

	test('plugins.renderPlaceholder renders a placeholder', () => {
		expect(
			Text.plugins.renderPlaceholder({
				node: {
					object: 'block',
					type: TEXT_LINE_NODE,
					text: '',
					data: { get: () => 'left' }
				}
			})
		).toMatchSnapshot()
	})

	test('plugins.onKeyDown deals with no text', () => {
		const change = {
			value: {
				blocks: [
					{
						key: 'mockBlockKey'
					}
				],
				document: {
					getClosest: () => false
				},
				endBlock: {
					key: 'mockKey',
					text: 'mockText'
				}
			}
		}
		change.insertBlock = jest.fn().mockReturnValueOnce(change)

		const event = {
			key: 'Enter',
			preventDefault: jest.fn()
		}

		Text.plugins.onKeyDown(event, change)

		expect(event.preventDefault).not.toHaveBeenCalled()
	})

	test('plugins.onKeyDown deals with [Backspace] or [Delete]', () => {
		const change = {
			value: {
				blocks: {
					get: () => ({ key: 'mockBlockKey' }),
					some: () => true
				},
				document: {
					getClosest: (num, funct) => {
						funct({ key: 'mockKey' })
						return {
							key: 'mockParent',
							nodes: { size: 1 }
						}
					}
				},
				endBlock: {
					key: 'mockKey',
					text: 'mockText'
				}
			}
		}
		change.removeNodeByKey = jest.fn().mockReturnValueOnce(change)

		const event = {
			key: 'Backspace',
			preventDefault: jest.fn()
		}

		Text.plugins.onKeyDown(event, change)

		expect(change.removeNodeByKey).not.toHaveBeenCalled()
		expect(event.preventDefault).not.toHaveBeenCalled()
	})

	test('plugins.onKeyDown deals with [Backspace] or [Delete] deletes empty text node', () => {
		const change = {
			value: {
				blocks: {
					get: () => ({ key: 'mockBlockKey' }),
					some: () => true
				},
				document: {
					getClosest: (num, funct) => {
						funct({ key: 'mockKey' })
						return {
							key: 'mockParent',
							nodes: { size: 1 }
						}
					}
				},
				endBlock: {
					key: 'mockKey',
					text: ''
				}
			}
		}
		change.removeNodeByKey = jest.fn().mockReturnValueOnce(change)

		const event = {
			key: 'Delete',
			preventDefault: jest.fn()
		}

		Text.plugins.onKeyDown(event, change)

		expect(change.removeNodeByKey).toHaveBeenCalled()
		expect(event.preventDefault).toHaveBeenCalled()
	})

	test('plugins.onKeyDown deals with first [Enter]', () => {
		const change = {
			value: {
				blocks: [
					{
						key: 'mockBlockKey'
					}
				],
				document: {
					getClosest: () => true
				},
				endBlock: {
					key: 'mockKey',
					text: 'mockText'
				}
			}
		}
		change.insertBlock = jest.fn().mockReturnValueOnce(change)

		const event = {
			key: 'Enter',
			preventDefault: jest.fn()
		}

		Text.plugins.onKeyDown(event, change)

		expect(change.insertBlock).not.toHaveBeenCalled()
	})

	test('plugins.onKeyDown deals with second [Enter]', () => {
		const change = {
			value: {
				blocks: [
					{
						key: 'mockBlockKey'
					}
				],
				document: {
					getClosest: () => true
				},
				endBlock: {
					key: 'mockKey',
					text: ''
				}
			}
		}
		change.removeNodeByKey = jest.fn().mockReturnValueOnce(change)
		change.splitBlock = jest.fn().mockReturnValueOnce(change)

		const event = {
			key: 'Enter',
			preventDefault: jest.fn()
		}

		Text.plugins.onKeyDown(event, change)

		expect(change.removeNodeByKey).toHaveBeenCalled()
		expect(event.preventDefault).toHaveBeenCalled()
	})

	test('plugins.onKeyDown deals with [Shift]+[Tab]', () => {
		const change = {
			value: {
				blocks: [
					{
						key: 'mockBlockKey',
						data: { get: () => 0 }
					}
				],
				document: {
					getClosest: () => true
				}
			}
		}
		change.setNodeByKey = jest.fn().mockReturnValueOnce(change)

		const event = {
			key: 'Tab',
			shiftKey: true,
			preventDefault: jest.fn()
		}

		Text.plugins.onKeyDown(event, change)

		expect(change.setNodeByKey).toHaveBeenCalled()
		expect(event.preventDefault).toHaveBeenCalled()
	})

	test('plugins.onKeyDown deals with [Shift]+[Tab] with indented text', () => {
		const change = {
			value: {
				blocks: [
					{
						key: 'mockBlockKey',
						data: { get: () => 6 }
					}
				],
				document: {
					getClosest: () => true
				}
			}
		}
		change.setNodeByKey = jest.fn().mockReturnValueOnce(change)

		const event = {
			key: 'Tab',
			shiftKey: true,
			preventDefault: jest.fn()
		}

		Text.plugins.onKeyDown(event, change)

		expect(change.setNodeByKey).toHaveBeenCalled()
		expect(event.preventDefault).toHaveBeenCalled()
	})

	test('plugins.onKeyDown deals with [Alt]+[Tab]', () => {
		const change = {
			value: {
				blocks: [
					{
						key: 'mockBlockKey',
						data: { get: () => 0 }
					}
				],
				document: {
					getClosest: () => true
				}
			}
		}
		change.setNodeByKey = jest.fn().mockReturnValueOnce(change)

		const event = {
			altKey: true,
			key: 'Tab',
			preventDefault: jest.fn()
		}

		Text.plugins.onKeyDown(event, change)

		expect(change.setNodeByKey).toHaveBeenCalledWith('mockBlockKey', {
			data: { indent: 1 }
		})
		expect(event.preventDefault).toHaveBeenCalled()
	})

	test('plugins.onKeyDown deals with [Alt]+[Tab] with 20 indents', () => {
		const change = {
			value: {
				blocks: [
					{
						key: 'mockBlockKey',
						data: { get: () => 20 }
					}
				],
				document: {
					getClosest: () => true
				}
			}
		}
		change.setNodeByKey = jest.fn().mockReturnValueOnce(change)

		const event = {
			altKey: true,
			key: 'Tab',
			preventDefault: jest.fn()
		}

		Text.plugins.onKeyDown(event, change)

		expect(change.setNodeByKey).toHaveBeenCalledWith('mockBlockKey', {
			data: { indent: 20 }
		})
		expect(event.preventDefault).toHaveBeenCalled()
	})

	test('plugins.onKeyDown deals with [Tab]', () => {
		const change = {
			value: {
				blocks: [
					{
						key: 'mockBlockKey',
						data: { get: () => 0 }
					}
				],
				document: {
					getClosest: () => true
				}
			}
		}
		change.insertText = jest.fn().mockReturnValueOnce(change)

		const event = {
			key: 'Tab',
			preventDefault: jest.fn()
		}

		Text.plugins.onKeyDown(event, change)

		expect(change.insertText).toHaveBeenCalledWith('\t')
		expect(event.preventDefault).toHaveBeenCalled()
	})

	test('plugins.onKeyDown deals with random keys', () => {
		const change = {
			value: {
				blocks: [
					{
						key: 'mockBlockKey',
						data: { get: () => 0 }
					}
				],
				document: {
					getClosest: (key, funct) => {
						funct({ type: 'mockType' })
						return true
					}
				}
			}
		}
		change.setNodeByKey = jest.fn().mockReturnValueOnce(change)

		const event = {
			key: 'e',
			preventDefault: jest.fn()
		}

		Text.plugins.onKeyDown(event, change)

		expect(change.setNodeByKey).not.toHaveBeenCalled()
		expect(event.preventDefault).not.toHaveBeenCalled()
	})

	test('plugins.schema.normalize fixes invalid children in text', () => {
		const change = {
			wrapBlockByKey: jest.fn()
		}

		Text.plugins.schema.blocks[TEXT_NODE].normalize(change, {
			code: CHILD_TYPE_INVALID,
			node: { nodes: { size: 5 } },
			child: { key: 'mockKey' },
			index: null
		})

		expect(change.wrapBlockByKey).toHaveBeenCalled()
	})

	test('plugins.schema.normalize fixes invalid block in text', () => {
		const change = {
			unwrapNodeByKey: jest.fn()
		}

		Text.plugins.schema.blocks[TEXT_NODE].normalize(change, {
			code: CHILD_TYPE_INVALID,
			node: { nodes: { size: 10 } },
			child: { object: 'block', key: 'mockKey' },
			index: 0
		})

		expect(change.unwrapNodeByKey).toHaveBeenCalled()
	})

	test('plugins.schema.normalize fixes required children in text', () => {
		const change = {
			insertNodeByKey: jest.fn()
		}

		Text.plugins.schema.blocks[TEXT_NODE].normalize(change, {
			code: CHILD_REQUIRED,
			node: { key: 'mockKey' },
			child: null,
			index: 0
		})

		expect(change.insertNodeByKey).toHaveBeenCalled()
	})

	test('plugins.schema.normalize fixes invalid children in text line', () => {
		const change = {
			unwrapNodeByKey: jest.fn()
		}

		Text.plugins.schema.blocks[TEXT_LINE_NODE].normalize(change, {
			code: CHILD_TYPE_INVALID,
			node: { nodes: { size: 5 } },
			child: { key: 'mockKey' },
			index: null
		})

		expect(change.unwrapNodeByKey).not.toHaveBeenCalled()
	})

	test('plugins.schema.normalize fixes invalid block in text line', () => {
		const change = {
			unwrapNodeByKey: jest.fn()
		}

		Text.plugins.schema.blocks[TEXT_LINE_NODE].normalize(change, {
			code: CHILD_TYPE_INVALID,
			node: { nodes: { size: 10 } },
			child: { object: 'block', key: 'mockKey' },
			index: 0
		})

		expect(change.unwrapNodeByKey).toHaveBeenCalled()
	})
})
