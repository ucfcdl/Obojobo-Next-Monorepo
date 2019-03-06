import React from 'react'

class Break extends React.Component {
	toggleSize() {
		const editor = this.props.editor
		const content = this.props.node.data.get('content')

		const newSize = content.width === 'normal' ? 'large' : 'normal'
		content.width = newSize

		return editor.setNodeByKey(this.props.node.key, {
			data: { content }
		})
	}

	render() {
		const { isSelected } = this.props
		return (
			<div
				className={`non-editable-chunk obojobo-draft--chunks--break viewer width-${
					this.props.node.data.get('content').width
				}`}
			>
				<hr />
				{isSelected ? <button onClick={() => this.toggleSize()}>Toggle Size</button> : null}
			</div>
		)
	}
}

export default Break
