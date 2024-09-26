const Adapter = {
	construct(model, attrs) {
		const content = attrs && attrs.content ? attrs.content : {}

		model.modelState.responseType = content.responseType || 'pick-one'
		model.modelState.shuffle = content.shuffle !== false
		model.modelState.partialScoring = content.partialScoring === true
	},

	clone(model, clone) {
		clone.modelState.responseType = model.modelState.responseType
		clone.modelState.shuffle = model.modelState.shuffle
		clone.modelState.partialScoring = model.modelState.partialScoring
	},

	toJSON(model, json) {
		json.content.responseType = model.modelState.responseType
		json.content.shuffle = model.modelState.shuffle
		json.content.partialScoring = model.modelState.partialScoring
	}
}

export default Adapter
