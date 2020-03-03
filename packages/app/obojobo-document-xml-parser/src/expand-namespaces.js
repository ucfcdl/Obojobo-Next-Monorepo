const expandNamespaces = (el, namespaces = {}) => {
	const thisNamespaces = Object.assign(namespaces, {})

	if (el.attributes) {
		for (const attrName in el.attributes) {
			if (attrName === 'xmlns') {
				thisNamespaces.__default = el.attributes.xmlns
				delete el.attributes.xmlns
			} else if (attrName.indexOf('xmlns') === 0) {
				thisNamespaces[attrName.substr(6)] = el.attributes[attrName]
			}
		}
	}

	if (el.type === 'element') {
		if (el.name.indexOf(':') === -1 && thisNamespaces.__default) {
			el.name = thisNamespaces.__default + ':' + el.name
		} else {
			for (const ns in thisNamespaces) {
				if (el.name.indexOf(ns) === 0) {
					el.name = el.name.replace(ns, thisNamespaces[ns])
				}
			}
		}
	}

	for (const i in el.elements) {
		expandNamespaces(el.elements[i], thisNamespaces)
	}
}

module.exports = expandNamespaces
