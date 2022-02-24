import './settings-dialog-form.scss'
import React, { useEffect, useMemo, useRef } from 'react'
import Switch from '../switch'
import 'obojobo-document-engine/src/scripts/common/components/switch.scss'

const renderInput = (item, value, onChange, ref) => {
	const id = `obojobo-draft--settings--item-${item.prop}`
	switch (item.type) {
		case 'switch':
			return <Switch id={id} checked={value === true} onChange={onChange} ref={ref} />

		case 'select':
			return (
				<select id={id} value={value} onChange={onChange} ref={ref}>
					{item.options.map(o => (
						<option key={o.value} value={o.value}>
							{o.label}
						</option>
					))}
				</select>
			)

		case 'number':
			return (
				<input
					type={item.type}
					id={id}
					min={item.min || Number.NEGATIVE_INFINITY}
					max={item.max || Number.POSITIVE_INFINITY}
					step="1"
					disabled={item.editable === false}
					value={value || ''}
					placeholder={item.placeholder || `${item.label} not set`}
					onChange={onChange}
					ref={ref}
				/>
			)

		default:
			return (
				<input
					type={item.type || 'text'}
					id={id}
					disabled={item.editable === false}
					value={value || ''}
					placeholder={item.placeholder || `${item.label} not set`}
					onChange={onChange}
					ref={ref}
				/>
			)
	}
}

const SettingsForm = ({ config, settings, onChange }) => {
	// memoize onChange callback functions
	// a parallel array to config (index will match config index)
	const memoizedOnChanges = useMemo(() => {
		return config.map(configItem => {
			return event => {
				onChange(configItem, event)
			}
		})
	}, [config, onChange])

	const refs = config.map(() => useRef(null))

	useEffect(() => {
		config.forEach((configItem, index) => {
			const ref = refs[index]

			// If this configItem has a validity property defined and
			// the element has setCustomValidity available then set it:
			if (
				typeof configItem.validity !== 'undefined' &&
				ref.current &&
				ref.current.setCustomValidity
			) {
				ref.current.setCustomValidity(configItem.validity)
			}
		})
	}, [settings])

	return (
		<div className="obojobo-draft--settings--form">
			{config.map((item, index) => {
				const ref = refs[index]

				switch (item.type) {
					case 'heading':
						return (
							<h2 key={index} ref={ref}>
								{item.text}
							</h2>
						)

					default:
						return (
							<React.Fragment key={index}>
								<label htmlFor={`obojobo-draft--settings--item-${item.prop}`}>{item.label}:</label>
								<div>
									{renderInput(item, settings[item.prop], memoizedOnChanges[index], ref)}
									{item.units ? (
										<span className="obojobo-draft--settings--units">{item.units}</span>
									) : null}
								</div>
							</React.Fragment>
						)
				}
			})}
		</div>
	)
}

export default SettingsForm
