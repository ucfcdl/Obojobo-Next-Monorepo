import KeyDownUtil from 'src/scripts/oboeditor/util/keydown-util'

describe('KeyDown Util', () => {
	test('deleteEmptyParent', () => {
		const editor = {
			value: {
				endBlock: {
					text: ''
				},
				document: {
					getClosest: (key, fn) => {
						// some
						fn({ type: 'someType' })
						return { nodes: { size: 1 } }
					}
				},
				blocks: { get: () => ({ key: 'mockKey', text: '' }) }
			},
			removeNodeByKey: jest.fn()
		}

		const event = {
			preventDefault: jest.fn()
		}

		expect(KeyDownUtil.deleteEmptyParent(event, editor, jest.fn(), 'someType')).toBe(true)
		expect(event.preventDefault).toHaveBeenCalledTimes(1)
		expect(editor.removeNodeByKey).toHaveBeenCalledTimes(1)

		editor.value.blocks = { get: () => ({ key: 'mockKey', text: 'mocktext' }) }
		/* eslint-disable-next-line */
		expect(KeyDownUtil.deleteEmptyParent(event, editor, jest.fn(), 'someType')).toBe(undefined)
		expect(event.preventDefault).toHaveBeenCalledTimes(1)
		expect(editor.removeNodeByKey).toHaveBeenCalledTimes(1)
	})

	test('deleteNodeContents deals with selection collapsed at start of block', () => {
		const editor = {
			value: {
				selection: {
					start: { offset: 0 },
					isCollapsed: true
				},
				blocks: [{ key: 'mockKey' }]
			}
		}

		const event = {
			preventDefault: jest.fn()
		}

		KeyDownUtil.deleteNodeContents(event, editor, jest.fn())
		expect(event.preventDefault).toHaveBeenCalled()
	})

	test('deleteNodeContents deals with selection inside cell', () => {
		const editor = {
			value: {
				selection: {
					start: { offset: 0 },
					isCollapsed: false
				},
				blocks: [{ key: 'mockKey' }]
			}
		}

		const event = {
			preventDefault: jest.fn()
		}

		KeyDownUtil.deleteNodeContents(event, editor, jest.fn())

		expect(event.preventDefault).not.toHaveBeenCalled()
	})

	test('deleteNodeContents deals with selection across cells without first cell', () => {
		const editor = {
			value: {
				startBlock: {
					key: 'mockStart'
				},
				endBlock: {
					key: 'mockEnd'
				},
				blocks: {
					some: () => true,
					toSet: () => ({
						first: () => false,
						last: () => true,
						rest: () => [{ nodes: [{ key: 'mock keyTwo' }] }],
						butLast: () => [{ nodes: [{ key: 'mock keyOne' }] }]
					})
				},
				selection: {
					start: { offset: 0 },
					isCollapsed: false,
					moveToStart: () => ({
						start: {
							isAtEndOfNode: value => value
						}
					}),
					moveToEnd: () => ({
						end: {
							isAtStartOfNode: value => value
						}
					})
				}
			}
		}
		editor.removeNodeByKey = jest.fn()

		const event = {
			preventDefault: jest.fn()
		}

		KeyDownUtil.deleteNodeContents(event, editor, jest.fn())

		expect(event.preventDefault).toHaveBeenCalled()
		expect(editor.removeNodeByKey).toHaveBeenCalled()
	})

	test('deleteNodeContents deals with selection across cells without last cell', () => {
		const editor = {
			value: {
				startBlock: {
					key: 'mockStart'
				},
				endBlock: {
					key: 'mockEnd'
				},
				blocks: {
					some: () => true,
					toSet: () => ({
						first: () => true,
						last: () => false,
						rest: () => [{ nodes: [{ key: 'mock keyTwo' }] }],
						butLast: () => [{ nodes: [{ key: 'mock keyOne' }] }]
					})
				},
				selection: {
					start: { offset: 0 },
					isCollapsed: false,
					moveToStart: () => ({
						start: {
							isAtEndOfNode: value => value
						}
					}),
					moveToEnd: () => ({
						end: {
							isAtStartOfNode: value => value
						}
					})
				}
			}
		}
		editor.removeNodeByKey = jest.fn()

		const event = {
			preventDefault: jest.fn()
		}

		KeyDownUtil.deleteNodeContents(event, editor, jest.fn())

		expect(event.preventDefault).toHaveBeenCalled()
		expect(editor.removeNodeByKey).toHaveBeenCalled()
	})
})
