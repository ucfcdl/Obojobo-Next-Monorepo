const processAttrs = require('../process-attrs')
const processTriggers = require('../process-triggers')
const processObjectives = require('../process-objectives')

const mathEquationNodeParser = node => {
	const id = node.id ? ` id="${node.id}"` : ''
	const attrs = processAttrs(node.content, ['triggers', 'actions'])
	const triggersXML = processTriggers(node.content.triggers)
	const objectivesXML = processObjectives(node.content.objectives)

	if (triggersXML) {
		return `<MathEquation${attrs}${id}>${triggersXML}${objectivesXML}</MathEquation>`
	}

	return `<MathEquation${attrs}${id} />`
}

module.exports = mathEquationNodeParser
