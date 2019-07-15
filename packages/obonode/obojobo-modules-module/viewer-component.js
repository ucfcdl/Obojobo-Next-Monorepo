import './viewer-component.scss'

import React from 'react'
import Viewer from 'obojobo-document-engine/src/scripts/viewer'

const { OboComponent } = Viewer.components
const { NavUtil } = Viewer.util

const Module = props => {
	// let childEl = null
	// const navTargetModel = NavUtil.getNavTargetModel(props.moduleData.navState)

	// if (navTargetModel && navTargetModel.getComponentClass) {
	// 	const ChildComponent = navTargetModel.getComponentClass()
	// 	childEl = <ChildComponent model={navTargetModel} moduleData={props.moduleData} />
	// }

	return (
		<OboComponent
			model={props.model}
			// moduleData={props.moduleData}
			className="obojobo-draft--modules--module"
			role="main"
		>
			{props.children}
		</OboComponent>
	)
}

export default Module
