import Common from 'Common'
import Editor from './index'

import React from 'react'
import ReactDOM from 'react-dom'

const debounce = function(ms, cb) {
	clearTimeout(debounce.id)
	return (debounce.id = setTimeout(cb, ms))
}
debounce.id = null

// set up global event listeners
const { Dispatcher } = Common.flux

// Set up listeners for window for blur/focus
const onFocus = function() {
	document.body.className = 'is-focused-window'
	return Dispatcher.trigger('window:focus')
}

const onBlur = function() {
	document.body.className = 'is-blured-window'
	return Dispatcher.trigger('window:blur')
}

const ie = false
//@cc_on ie = true;
if (ie) {
	document.onfocusin = onFocus
	document.onfocusout = onBlur
} else {
	window.onfocus = onFocus
	window.onblur = onBlur
}

window.__oboEditorRender = (settings = {}) => {
	ReactDOM.render(
		<div className="root">
			<Editor.components.EditorApp settings={settings} />
		</div>,
		document.getElementById('viewer-app')
	)
}
