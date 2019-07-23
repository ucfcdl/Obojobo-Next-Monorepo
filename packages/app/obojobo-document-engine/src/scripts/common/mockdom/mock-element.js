class MockElement {
	constructor(type, attrs = {}) {
		this.type = type
		this.attrs = attrs
		this.nodeType = 'element'
		this.children = []
		this.parent = null
	}

	addChild(child) {
		this.children.push(child)
		return (child.parent = this)
	}

	addChildAt(child, atIndex) {
		this.children.splice(atIndex, 0, child)
		return (child.parent = this)
	}

	addBefore(childToAdd, targetChild) {
		const index = this.children.indexOf(targetChild)
		return this.addChildAt(childToAdd, index)
	}

	addAfter(childToAdd, targetChild) {
		const index = this.children.indexOf(targetChild)
		return this.addChildAt(childToAdd, index + 1)
	}

	replaceChild(childToReplace, newChild) {
		const index = this.children.indexOf(childToReplace)
		this.children[index] = newChild
		newChild.parent = this
		return (childToReplace.parent = null)
	}
}

Object.defineProperties(MockElement.prototype, {
	firstChild: {
		get() {
			return this.children[0]
		}
	},
	lastChild: {
		get() {
			return this.children[this.children.length - 1]
		}
	}
})

module.exports = MockElement
