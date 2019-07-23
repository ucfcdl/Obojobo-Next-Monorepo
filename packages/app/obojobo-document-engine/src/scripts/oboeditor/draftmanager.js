/* eslint-disable no-alert */
/* eslint-disable no-console */

const domParser = new DOMParser()
let childWindow = null
const draftSearchStrings = []
const draftEls = document.querySelectorAll('.link-edit')
let isCtrlPressed = false
let editingDraftId = null

document.getElementById('add-image-form').addEventListener('submit', onSubmitInsertImage)

// Setup unload
window.onbeforeunload = function() {
	const unsavedEls = document.getElementsByClassName('unsaved')
	if (unsavedEls.length > 0) {
		return true // Returning true will cause browser to ask user to confirm leaving page
	}
	//eslint-disable-next-line
	return undefined // Returning undefined will allow browser to close normally
}

// Reload preview windows:
//eslint-disable-next-line
function preview(draftId, url) {
	childWindow = window.open(url, 'preview')
}

// Setup search
document.getElementById('remove-search').addEventListener('click', function() {
	document.getElementById('search-input').value = ''
	search('')
})
document.getElementById('search').addEventListener('keyup', function(event) {
	search(event.target.value)
})

for (let i = 0, len = draftEls.length; i < len; i++) {
	draftSearchStrings.push(draftEls[i].getAttribute('data-search-str'))
}
function search(ss) {
	ss = ss.toLowerCase()
	draftSearchStrings.forEach(function(draftSS) {
		const id = draftSS.split(' ')[0]
		const el = document.getElementById(id)
		if (ss === '' || draftSS.indexOf(ss) > -1) {
			el.style.display = 'block'
		} else {
			el.style.display = 'none'
		}
	})
}

document.addEventListener('keydown', function(event) {
	if (event.key === 'Meta') {
		isCtrlPressed = true
		return
	}
	if (event.keyCode === 83 && isCtrlPressed) {
		event.preventDefault()
		saveDraft()
	}
	isCtrlPressed = false
})
document.addEventListener('keyup', function(event) {
	if (event.keyCode === 83 && event.ctrlKey) {
		event.preventDefault()
		saveDraft()
	}
})

//eslint-disable-next-line
const editor = CodeMirror(document.getElementById('edit'), {
	lineNumbers: true,
	mode: 'text/xml',
	matchTags: true,
	foldGutter: true,
	lineWrapping: true,
	indentWithTabs: true,
	tabSize: 4,
	indentUnit: 4,
	gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
	theme: 'monokai'
})

// wire up (edit) buttons:
const editLinks = document.getElementsByClassName('link-edit')
for (let i = 0; i < editLinks.length; i++) {
	editLinks[i].addEventListener('click', function(event) {
		edit(event.target.getAttribute('data-id'))
	})
}

const delLinks = document.getElementsByClassName('link-delete')
for (let i = 0; i < delLinks.length; i++) {
	delLinks[i].addEventListener('click', function(event) {
		del(event.target.getAttribute('data-id'))
	})
}

// wire up get url buttons
const urlLinks = document.getElementsByClassName('link-url')
for (let i = 0; i < urlLinks.length; i++) {
	urlLinks[i].addEventListener('click', function(event) {
		event.preventDefault()
		event.stopPropagation()
		getURL(event.target.getAttribute('data-id'))
		return false
	})
}

document.getElementById('button-create-new-draft').addEventListener('click', function() {
	fetch('/api/drafts/new', {
		method: 'POST',
		credentials: 'include',
		body: '',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json'
		}
	})
		.then(function(resp) {
			resp.json().then(function(json) {
				if (json.value.id) {
					location.hash = 'id:' + json.value.id
					location.reload()
				} else {
					alert('Something went wrong, please try again')
					console.error(json)
				}
			})
		})
		.catch(function(error) {
			alert('Error: ' + error)
			console.error(error)
		})
})

// Set up OboEditor items
function createTutorialDraft() {
	fetch('/api/drafts/tutorial', {
		method: 'POST',
		credentials: 'include',
		body: '',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json'
		}
	})
		.then(function(resp) {
			resp.json().then(function(json) {
				if (json.value.id) {
					window.location.hash = 'id:' + json.value.id
					window.location.reload()
				} else {
					window.alert('Something went wrong, please try again')
					console.error(json)
				}
			})
		})
		.catch(function(error) {
			window.alert('Error: ' + error)
			console.error(error)
		})
}
// Add tutorial draft if the user has no drafts
if (draftEls.length === 0) {
	createTutorialDraft()
}

document.getElementById('button-save-draft').addEventListener('click', saveDraft)
//eslint-disable-next-line
function addQuestion() {
	const questionText =
		'<Question>\n					<h1>Your question here</h1>\n					<MCAssessment responseType="pick-one" shuffle="true">\n						<MCChoice score="100">\n							<MCAnswer>\n								<p>Answer 1 text</p>\n							</MCAnswer>\n							<MCFeedback>\n								<p>Optional answer 1 feedback</p>\n							</MCFeedback>\n						</MCChoice>\n						<MCChoice score="0">\n							<MCAnswer>\n								<p>Answer 2 text</p>\n							</MCAnswer>\n							<MCFeedback>\n								<p>Optional answer 2 feedback</p>\n							</MCFeedback>\n						</MCChoice>\n					</MCAssessment>\n					<!-- Optional solution: -->\n					<solution>\n						<Page>\n							<p>Add additional information here</p>\n						</Page>\n					</solution>\n				</Question>'
	editor.replaceSelection(questionText)
	setTimeout(function() {
		editor.focus()
	}, 100)
}

//eslint-disable-next-line
function addImage() {
	const addImageModalEl = document.getElementById('add-image-modal')
	addImageModalEl.style.display = 'block'
}

function enableLoadingSpinner() {
	document.getElementById('image-loading').style.display = 'block'
}

function disableLoadingSpinner() {
	document.getElementById('image-loading').style.display = 'none'
}

//eslint-disable-next-line
function onChangeImageSize(radioEl) {
	const customSizeInputsEl = document.getElementById('custom-size-inputs')
	customSizeInputsEl.style.visibility = radioEl.value === 'custom' ? 'visible' : 'hidden'
}

function closeInsertImageModal() {
	const addImageModalEl = document.getElementById('add-image-modal')
	addImageModalEl.style.display = 'none'
	resetImageForm()
}

//eslint-disable-next-line
function onUpdateImage() {
	const modal = document.getElementById('add-image-form')
	if (event.target.value) {
		modal.classList.add('on-step-2')
	} else {
		modal.classList.remove('on-step-2')
	}
}

function resetImageForm() {
	document.getElementById('add-image-form').classList.remove('on-step-2')
	document.getElementById('add-image-form').reset()
	disableLoadingSpinner()
	document.getElementById('custom-size-inputs').style.visibility = 'hidden'
}

function writeImageToDocument(mediaId) {
	const customWidth = document.getElementById('custom-width').value
	const customHeight = document.getElementById('custom-height').value
	const customCaption = document.getElementById('image-caption').value
	const customAlt = document.getElementById('alt-text').value
	const selectedSize = document.querySelector('input[name="size"]:checked').value
	const customAttributes = {
		size: selectedSize,
		width: customWidth,
		height: customHeight,
		alt: customAlt
	}
	let imgString = '<figure>\n					<img src="' + mediaId + '" '
	Object.keys(customAttributes).forEach(key => {
		switch (key) {
			case 'size':
				imgString += 'size="' + selectedSize + '" '
				break
			case 'width':
				// b/c IE doesn't support input type number do num validation here
				if (!isNaN(parseInt(customAttributes[key], 10))) {
					imgString += 'width="' + customAttributes[key] + '" '
				}
				break
			case 'height':
				// b/c IE doesn't support input type number do num validation here
				if (!isNaN(parseInt(customAttributes[key], 10))) {
					imgString += 'height="' + customAttributes[key] + '" '
				}
				break
			case 'alt':
				if (customAttributes[key]) {
					imgString += 'alt="' + customAttributes[key] + '" '
				}
				break
		}
	})
	imgString += '/>'
	if (customCaption) {
		imgString += '\n					<figcaption>' + customCaption + '</figcaption>'
	}
	imgString += '\n				</figure>'
	editor.replaceSelection(imgString)
	setTimeout(function() {
		editor.focus()
	}, 100)
}

function onSubmitInsertImage(event) {
	event.preventDefault()
	enableLoadingSpinner()
	const fileInput = document.getElementById('image-file-input')
	const file = fileInput.files[0]
	const formData = new FormData()
	formData.append('userImage', file, file.name)
	const request = new XMLHttpRequest()
	request.onreadystatechange = function() {
		// response text contains the media id upon successful upload, and the error message for
		// 	unsuccessful uploads
		if (request.readyState === 4) {
			if (request.status === 200) {
				const res = JSON.parse(request.responseText)
				writeImageToDocument(res.media_id)
				closeInsertImageModal()
			} else {
				alert(request.responseText)
				disableLoadingSpinner()
			}
		}
	}
	request.open('POST', '/api/media/upload', true)
	request.send(formData)
}

function saveDraft() {
	if (!editingDraftId) return
	const draftContent = editor.getValue()
	document.getElementById(editingDraftId).setAttribute('data-content', draftContent)
	postCurrentlyEditingDraft(draftContent)
}

function edit(draftId) {
	if (!draftId) return
	editor.off('change', onEditorChange)
	// if the selected draftId isn't loaded
	// do nothing and reset the url
	const el = document.getElementById(draftId)
	if (!el) {
		location.hash = ''
		return
	}
	const content = el.getAttribute('data-content')
	document.getElementById('editor').style.display = 'block'
	editingDraftId = draftId
	const selected = document.getElementsByClassName('selected')
	if (selected[0]) selected[0].classList.remove('selected')
	document.getElementById(draftId).classList.add('selected')
	if (content.charAt(0) === '<') {
		editor.setOption('mode', 'text/xml')
	} else {
		editor.setOption('mode', 'application/json')
	}
	editor.setValue(content)
	location.hash = 'id:' + draftId
	editor.on('change', onEditorChange)
}

function del(draftId) {
	const response = confirm('Are you sure you want to delete ' + draftId + '?')
	if (!response) return
	fetch('/api/drafts/' + draftId, {
		method: 'DELETE',
		credentials: 'include',
		body: '',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json'
		}
	})
		.then(function(resp) {
			resp.json().then(function(json) {
				if (json.status.toLowerCase() === 'ok') {
					location.reload()
				} else {
					alert('Error')
				}
			})
		})
		.catch(function(error) {
			alert('Error: ' + error.toString())
			console.error(error)
		})
}

function getURL(draftId) {
	const str = window.location.origin + '/view/' + draftId
	// Loads the url into an invisible textarea
	// to copy it to the clipboard
	const el = document.createElement('textarea')
	el.value = str
	el.setAttribute('readonly', '')
	el.style.position = 'absolute'
	el.style.left = '-9999px'
	document.body.appendChild(el)
	const selected =
		document.getSelection().rangeCount > 0 ? document.getSelection().getRangeAt(0) : false
	el.select()
	document.execCommand('copy')
	document.body.removeChild(el)
	if (selected) {
		document.getSelection().removeAllRanges()
		document.getSelection().addRange(selected)
	}
	const linkURLEl = document.getElementById(draftId).getElementsByClassName('link-url')[0]
	linkURLEl.innerText = 'Get URL - Copied to the clipboard!'
	linkURLEl.classList.add('copied')
	setTimeout(function() {
		linkURLEl.innerText = 'Get URL'
		linkURLEl.classList.remove('copied')
	}, 2000)
}

function postCurrentlyEditingDraft(draftContent) {
	let mime
	// try to parse JSON, if it works we assume we're sending JSON.
	// otherwise send as plain text in the hopes that it's XML
	try {
		JSON.parse(draftContent)
		mime = 'application/json'
	} catch (e) {
		mime = 'text/plain'
	}
	fetch('/api/drafts/' + editingDraftId, {
		method: 'POST',
		credentials: 'include',
		body: draftContent,
		headers: {
			Accept: mime,
			'Content-Type': mime
		}
	})
		.then(function(res) {
			switch (res.status) {
				case 200:
					res.json().then(function(json) {
						if (json.value.id) {
							document.body.classList.add('saved')
							document.getElementById('button-save-draft').innerText = 'Saved!'
							document.getElementById('button-save-draft').disabled = true
							setTimeout(function() {
								document.body.classList.remove('saved')
								document.getElementById('button-save-draft').innerText = 'Save Draft'
								document.getElementById('button-save-draft').disabled = false
							}, 1000)
							if (childWindow && childWindow.location && childWindow.location.reload) {
								childWindow.location.reload()
							}
							updateTitleFromEditor(editingDraftId)
							document.getElementById(editingDraftId).classList.remove('unsaved')
						} else {
							alert('Something went wrong, please try again')
							console.error(json)
						}
					})
					break
				default:
					res
						.json()
						.then(function(json) {
							alert('Error: ' + json.value.message + ' (' + res.status + ')')
						})
						.catch(function() {
							alert('Error: ' + res.statusText + ' (' + res.status + ')')
						})
					break
			}
		})
		.catch(function(error) {
			alert('Error: ' + error)
			console.error(error)
		})
}

function updateTitleFromEditor(draftId) {
	const title = getTitleFromEditor()
	if (!title) return
	try {
		const el = document.getElementById(draftId).getElementsByClassName('title')[0]
		el.innerText = title
	} catch (e) {
		// Do nothing
	}
}

function getTitleFromEditor() {
	try {
		const doc = domParser.parseFromString(editor.getValue(), 'application/xml')
		let els = doc.getElementsByTagName('Module')
		if (els.length === 0) {
			els = doc.getElementsByTagName('ObojoboDraft.Modules.Module')
		}
		if (els.length > 0) {
			const el = els[0]
			const title = el.getAttribute('title')
			if (title) return title
		}
	} catch (e) {
		// Do nothing
		return null
	}

	return null
}

function onEditorChange() {
	const el = document.getElementById(editingDraftId)
	el.setAttribute('data-content', editor.getValue())
	el.classList.add('unsaved')
}

//eslint-disable-next-line
function openInBetaEditor(draftId) {
	const el = document.getElementById(draftId)
	let confirm = true
	if (el.getAttribute('data-content-type') === 'xml') {
		confirm = window.confirm(
			'Wait! Editing this document in the Beta OboEditor will convert your document from XML to JSON. Are you sure you want to continue?'
		)
	}
	if (confirm) {
		window.open('/editor/' + draftId, '_blank')
	}
}

if (location.hash.indexOf('#id:') === 0) {
	edit(location.hash.substr(4))
}
