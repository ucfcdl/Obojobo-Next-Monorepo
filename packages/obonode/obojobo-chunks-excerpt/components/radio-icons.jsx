import './radio-icons.scss'

import React from 'react'

const RadioIcons = ({ name, options, selectedOption, ariaLabel, onChangeOption }) => {
	const onMouseDown = (option, event) => {
		event.preventDefault()

		onChangeOption(option)
	}

	const onChange = event => {
		event.preventDefault()

		onChangeOption(event.target.value)
	}

	return (
		<div className={`excerpt--radio-icons`} role="radiogroup" aria-label={ariaLabel}>
			<div className="options">
				{options.map((o, i) => (
					<label
						key={o.label}
						className={
							(selectedOption === o.label ? 'is-selected' : 'is-not-selected') +
							' is-option-' +
							o.label
						}
						style={{ transform: `translate(${-i}px, 0)` }}
						onMouseDown={onMouseDown.bind(null, o.label)}
					>
						<input
							type="radio"
							name={name}
							value={o.label}
							checked={selectedOption === o.label}
							onChange={onChange}
						/>
						<span>{o.label}</span>
						{typeof o.icon === 'function' ? o.icon() : <img src={o.icon}></img>}
					</label>
				))}
			</div>
		</div>
	)
}

export default RadioIcons
