require('./course-stats-filter-controls.scss')
const React = require('react')

function CourseStatsFilterControls({ filterSettings, onChangeFilterSettings }) {
	const onChangeShowIncompleteAttempts = event => {
		onChangeFilterSettings({
			showPreviewAttempts: filterSettings.showPreviewAttempts,
			showAdvancedFields: filterSettings.showAdvancedFields,
			showIncompleteAttempts: event.target.checked
		})
	}

	const onChangeShowPreviewAttempts = event => {
		onChangeFilterSettings({
			showIncompleteAttempts: filterSettings.showIncompleteAttempts,
			showAdvancedFields: filterSettings.showAdvancedFields,
			showPreviewAttempts: event.target.checked
		})
	}

	const onChangeShowAdvancedFields = event => {
		onChangeFilterSettings({
			showIncompleteAttempts: filterSettings.showIncompleteAttempts,
			showPreviewAttempts: filterSettings.showPreviewAttempts,
			showAdvancedFields: event.target.checked
		})
	}

	return (
		<div className="repository--course-stats-filter-controls">
			<div className="container">
				<label>
					<input
						className="show-incomplete-attempts"
						type="checkbox"
						checked={filterSettings.showIncompleteAttempts}
						onChange={onChangeShowIncompleteAttempts}
					/>
					<span>Incomplete attempts</span>
				</label>
				<label>
					<input
						className="show-preview-attempts"
						type="checkbox"
						checked={filterSettings.showPreviewAttempts}
						onChange={onChangeShowPreviewAttempts}
					/>
					<span>Preview attempts</span>
				</label>
				<label>
					<input
						className="show-advanced-fields"
						type="checkbox"
						checked={filterSettings.showAdvancedFields}
						onChange={onChangeShowAdvancedFields}
					/>
					<span>Advanced fields</span>
				</label>
			</div>
		</div>
	)
}

module.exports = CourseStatsFilterControls
