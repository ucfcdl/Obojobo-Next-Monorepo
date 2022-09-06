const React = require('react')
const DataTable = require('react-data-table-component').default
const ButtonLink = require('../button-link')

const getColumns = (columns, showAdvancedFields) =>
	showAdvancedFields ? columns : columns.filter(col => !col.advanced)

const toCSV = (columns, attempts) => {
	const cols = `"${columns.map(c => c.name).join('","')}"`
	const colOrder = columns.map(c => c.selector)
	const rows = attempts.map(
		attempt =>
			`"${colOrder.map(key => (attempt[key] === null ? 'null' : attempt[key])).join('","')}"`
	)
	return `${cols}\n${rows.join('\n')}`
}

const getFileName = (
	csvFileName,
	attempts,
	{ showIncompleteAttempts, showPreviewAttempts, showAdvancedFields }
) => {
	const drafts = [...new Set(attempts.map(row => row.draftId))]

	return (
		[
			csvFileName,
			showIncompleteAttempts ? 'with-incomplete-attempts' : '',
			showPreviewAttempts ? 'with-preview-attempts' : '',
			showAdvancedFields ? 'with-advanced-fields' : ''
		]
			.filter(s => s)
			.join('-') +
		'__' +
		drafts.join('_')
	)
}

const getTableName = (tableName, { showIncompleteAttempts, showPreviewAttempts }) => {
	if (showIncompleteAttempts && showPreviewAttempts) {
		return tableName + ' (including incomplete and preview attempts)'
	} else if (showIncompleteAttempts) {
		return tableName + ' (including incomplete attempts)'
	} else if (showPreviewAttempts) {
		return tableName + ' (including preview attempts)'
	}

	return tableName
}

const searchDataBasedOnParams = (rows, searchSettings, searchContent) => {
	const text = searchContent.text
	const dates = searchContent.date

	if (rows && rows.length > 0) {
		// Filtering according to starting and ending dates.
		if (dates) {
			rows = rows.filter(row => {
				if (!row.completedAt) return row.completedAt
				const dateCompleted = new Date(row.completedAt)
				const start = dates.start ? new Date(dates.start) : null
				const end = dates.end ? new Date(dates.end) : null

				if (!start && !end) return row
				if (!start) return dateCompleted <= end
				if (!end) return dateCompleted >= start

				return dateCompleted >= start && dateCompleted <= end
			})
		}

		if (text) {
			let param = searchSettings
				.split('-')
				.map(word => word.charAt(0).toUpperCase() + word.substring(1))
				.join('')
			param = param.charAt(0).toLowerCase() + param.substring(1)

			// Filtering according to search params (course title, user's first name, etc)
			rows = rows.filter(row => {
				return row[param] && row[param].toLowerCase().match(text.toLowerCase())
			})
		}
	}
	return rows
}

function DataGridScores({
	columns,
	rows = [],
	tableName,
	csvFileName,
	filterSettings,
	searchSettings,
	searchContent
}) {
	const filteredColumns = getColumns(columns, filterSettings.showAdvancedFields)
	rows = searchDataBasedOnParams(rows, searchSettings, searchContent)
	return (
		<div className="repository--data-grid-scores">
			<div className="data-grid">
				<DataTable
					title={getTableName(tableName, filterSettings)}
					columns={filteredColumns}
					data={rows}
					striped={true}
					dense={true}
					pagination={true}
					paginationPerPage={250}
					paginationRowsPerPageOptions={[250]}
					paginationComponentOptions={{ noRowsPerPage: true }}
				/>
			</div>
			{rows.length > 0 ? (
				<ButtonLink
					url={`data:text/csv;charset=utf-8,${escape(toCSV(filteredColumns, rows))}`}
					download={getFileName(csvFileName, rows, filterSettings)}
				>
					⬇️&nbsp;&nbsp;&nbsp;Download {filterSettings.showAdvancedFields ? 'Advanced' : ''} Table
					as CSV File ({rows.length} row
					{rows.length === 1 ? '' : 's'})
				</ButtonLink>
			) : null}
		</div>
	)
}

module.exports = DataGridScores
