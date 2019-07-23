const questionNodeParser = (node, childrenParser) => {
	const id = node.id ? ` id="${node.id}"` : ''
	const solution = node.content.solution
	let solutionXML = ''

	if (solution) {
		solutionXML = `<solution>` + childrenParser([solution]) + `</solution>`
	}

	return `<Question${id}>` + solutionXML + childrenParser(node.children) + `</Question>`
}

module.exports = questionNodeParser
