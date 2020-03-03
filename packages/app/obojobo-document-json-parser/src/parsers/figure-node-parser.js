const textGroupParser = require('../text-group-parser')
const processAttrs = require('../process-attrs')
const processTriggers = require('../process-triggers')

const figureNodeParser = node => {
	const id = node.id ? ` id="${node.id}"` : ''
	const textGroupXML = textGroupParser(node.content.textGroup)
	const triggersXML = processTriggers(node.content.triggers)
	const attrs = processAttrs(node.content, ['textGroup', 'triggers', 'actions'])

	return `<Figure${attrs}${id}>` + textGroupXML + triggersXML + `</Figure>`
}

module.exports = figureNodeParser
