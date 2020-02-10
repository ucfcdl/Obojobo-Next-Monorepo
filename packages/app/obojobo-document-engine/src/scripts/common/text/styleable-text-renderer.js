// Turns a StyleableText item into a mock DOM tree, which can then be used to render out in React

const katex = require('katex')

const StyleType = require('./style-type')
const MockElement = require('../mockdom/mock-element')
const MockTextNode = require('../mockdom/mock-text-node')

const ORDER = [
	StyleType.COMMENT,
	StyleType.LATEX,
	StyleType.LINK,
	StyleType.QUOTE,
	StyleType.BOLD,
	StyleType.STRIKETHROUGH,
	StyleType.MONOSPACE,
	StyleType.SUPERSCRIPT,
	StyleType.ITALIC
]

const getTextNodeFragmentDescriptorsAtHelper = function(
	stateObj,
	targetStartIndex,
	targetEndIndex
) {
	if (stateObj.curNode.nodeType === 'element') {
		return Array.from(stateObj.curNode.children).map(
			child => (
				(stateObj.curNode = child),
				getTextNodeFragmentDescriptorsAtHelper(stateObj, targetStartIndex, targetEndIndex)
			)
		)
	} else {
		const charsRead = stateObj.charsRead + stateObj.curNode.text.length

		if (charsRead >= targetEndIndex && stateObj.end === null) {
			stateObj.end = {
				node: stateObj.curNode,
				startIndex: 0,
				endIndex: targetEndIndex - stateObj.charsRead
			}
		} else if (stateObj.start !== null && stateObj.end === null) {
			stateObj.inbetween.push({
				node: stateObj.curNode,
				startIndex: 0,
				endIndex: Infinity
			})
		}

		if (charsRead >= targetStartIndex && stateObj.start === null) {
			stateObj.start = {
				node: stateObj.curNode,
				startIndex: targetStartIndex - stateObj.charsRead,
				endIndex: Infinity
			}
		}

		stateObj.last = {
			node: stateObj.curNode,
			startIndex: 0,
			endIndex: Infinity
		}

		return (stateObj.charsRead = charsRead)
	}
}

const getTextNodeFragmentDescriptorsAt = function(rootNode, startIndex, endIndex) {
	const stateObj = {
		charsRead: 0,
		start: null,
		inbetween: [],
		end: null,
		curNode: rootNode
	}

	getTextNodeFragmentDescriptorsAtHelper(stateObj, startIndex, endIndex)
	if (stateObj.end === null) {
		stateObj.end = stateObj.last
	}

	// If start and end are equal just modify start and delete end
	if (stateObj.start.node === stateObj.end.node) {
		stateObj.start.endIndex = stateObj.end.endIndex
		stateObj.end = null
	}

	const fragmentDescriptors = stateObj.inbetween

	fragmentDescriptors.unshift(stateObj.start)

	if (stateObj.end !== null) {
		fragmentDescriptors.push(stateObj.end)
	}

	return fragmentDescriptors
}

const wrapElement = function(styleRange, nodeToWrap, text) {
	let newChild, node, root
	switch (styleRange.type) {
		case 'sup': {
			let level = styleRange.data
			if (level > 0) {
				node = root = new MockElement('sup')
				while (level > 1) {
					newChild = new MockElement('sup')
					node.addChild(newChild)
					node = newChild
					level--
				}
			} else {
				level = Math.abs(level)
				node = root = new MockElement('sub')
				while (level > 1) {
					newChild = new MockElement('sub')
					node.addChild(newChild)
					node = newChild
					level--
				}
			}

			nodeToWrap.parent.replaceChild(nodeToWrap, root)
			node.addChild(nodeToWrap)
			nodeToWrap.text = text
			return root
		}

		case '_comment':
			newChild = new MockElement('span', Object.assign({ class: 'comment' }, styleRange.data))
			nodeToWrap.parent.replaceChild(nodeToWrap, newChild)
			newChild.addChild(nodeToWrap)
			nodeToWrap.text = text
			return newChild

		case '_latex': {
			/*
			Note on aria-label, math and accessibility: It seems that screenreaders are not very consistant in
			reading MathML. Chromevox will sometimes read the MathML when going through the document, however
			when focused on this chunk (for example) ChromeVox will remain silent. It is difficult to predict
			when ChromeVox will read math and when it won't.

			Our solution is to allow document authors to provide an `alt` property which would be the text version
			of a mathematical equation (for example, "x equals sin of theta"). If no `alt` property exists then we
			fall back to the raw LaTeX used to generate the equation. This is not ideal but is the best compromise
			that we have currently as this will always be read.

			If given only the aria-label ChromeVox will sometimes read the aria-label and sometimes read the
			actual MathML generated by KaTeX. In order to be consistant the MathML is hidden from readers so
			that the aria-label is always read.
			*/
			let html

			if (!styleRange.data.alt) {
				styleRange.data.alt = text
			}
			newChild = new MockElement(
				'span',
				Object.assign({ class: 'latex', role: 'math' }, styleRange.data)
			)
			nodeToWrap.parent.replaceChild(nodeToWrap, newChild)
			newChild.addChild(nodeToWrap)

			try {
				html = katex.renderToString(text)
			} catch (e) {
				html = e.message
			}

			nodeToWrap.html = `<span aria-hidden="true">${html}</span>`
			nodeToWrap.text = text
			return newChild
		}

		case StyleType.MONOSPACE:
			styleRange.type = 'code'
		// Intentional fallthrough

		default:
			newChild = new MockElement(styleRange.type, Object.assign({}, styleRange.data))
			nodeToWrap.parent.replaceChild(nodeToWrap, newChild)
			newChild.addChild(nodeToWrap)
			nodeToWrap.text = text
			return newChild
	}
}

const wrap = function(styleRange, nodeFragmentDescriptor) {
	let newChild
	let nodeToWrap = nodeFragmentDescriptor.node
	const { text } = nodeToWrap
	const fromPosition = nodeFragmentDescriptor.startIndex
	const toPosition = nodeFragmentDescriptor.endIndex

	const leftText = text.substring(0, fromPosition)
	const wrappedText = text.substring(fromPosition, toPosition)
	const rightText = text.substring(toPosition)

	if (wrappedText.length === 0) {
		return
	}

	// add in left text
	if (leftText.length > 0) {
		newChild = new MockTextNode(leftText)
		nodeToWrap.parent.addBefore(newChild, nodeToWrap)
	}

	// add in wrapped text
	nodeToWrap = wrapElement(styleRange, nodeToWrap, wrappedText)

	// add in right text
	if (rightText.length > 0) {
		newChild = new MockTextNode(rightText)
		return nodeToWrap.parent.addAfter(newChild, nodeToWrap)
	}
}

const applyStyle = function(el, styleRange) {
	const fragmentDescriptors = getTextNodeFragmentDescriptorsAt(el, styleRange.start, styleRange.end)
	return (() => {
		const result = []
		for (let i = fragmentDescriptors.length - 1; i >= 0; i--) {
			const fragmentDescriptor = fragmentDescriptors[i]
			result.push(wrap(styleRange, fragmentDescriptor))
		}
		return result
	})()
}

const getMockElement = function(styleableText) {
	const root = new MockElement('span')
	root.addChild(new MockTextNode(styleableText.value))

	for (const styleType of Array.from(ORDER)) {
		for (const styleRange of Array.from(styleableText.styleList.styles)) {
			if (styleRange.type === styleType) {
				applyStyle(root, styleRange)
			}
		}
	}

	return root
}

module.exports = getMockElement
