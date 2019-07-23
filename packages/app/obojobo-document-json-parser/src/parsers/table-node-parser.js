const textGroupParser = require('../text-group-parser')

const tableNodeParser = node => {
	const id = node.id ? ` id="${node.id}"` : ''

	const header = Boolean(node.content.header)
	const numRows = node.content.textGroup.numRows
	const numCols = node.content.textGroup.numCols

	const textGroupXML = textGroupParser(node.content.textGroup.textGroup)

	return (
		`<Table numRows="${numRows}" numCols="${numCols}" header="${header}"${id}>` +
		textGroupXML +
		`</Table>`
	)
}

module.exports = tableNodeParser
