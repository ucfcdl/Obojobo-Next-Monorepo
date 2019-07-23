const textGroupParser = require('../text-group-parser')
const xmlEncode = require('../xml-encode')
const processAttrs = require('../process-attrs')

const actionButtonNodeParser = node => {
	const id = node.id ? ` id="${node.id}"` : ''
	const attrs = processAttrs(node.content, ['triggers', 'textGroup', 'actions'])
	const textGroupXML = textGroupParser(node.content.textGroup)
	const triggersXML = triggersParser(node.content.triggers)

	return `<ActionButton${attrs}${id}>` + textGroupXML + triggersXML + `</ActionButton>`
}

const triggersParser = triggers => {
	if (!triggers) return ''

	let triggersBodyXML = ''
	triggers.forEach(trigger => {
		if (!trigger.actions) return

		let triggerXML = ''
		let actionsBodyXML = ''

		// Parser actions in each trigger
		trigger.actions.forEach(action => {
			const attrs = processAttrs(action.value, [])
			actionsBodyXML += `<action type="${action.type}">` + `<value${attrs} />` + `</action>`
		})

		let actionsXML = ''
		if (actionsBodyXML !== '') {
			actionsXML = `<actions>` + actionsBodyXML + `</actions>`
			triggerXML = `<trigger type="${xmlEncode(trigger.type)}">` + actionsXML + `</trigger>`
		}

		triggersBodyXML += triggerXML
	})

	const triggersXML = triggersBodyXML !== '' ? `<triggers>` + triggersBodyXML + `</triggers>` : ''

	return triggersXML
}

module.exports = actionButtonNodeParser
