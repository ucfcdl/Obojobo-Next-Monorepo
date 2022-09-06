import React from 'react'
import renderer from 'react-test-renderer'
import DataGridScores from './data-grid-scores'

const ButtonLink = require('../button-link')

jest.mock('react-data-table-component', () => ({
	default: props => (
		<div {...props} className="react-data-table-component">
			react-data-table-component
		</div>
	)
}))

describe('DataGridScores', () => {
	const getTestProps = () => ({
		columns: [
			{
				name: 'Draft ID',
				selector: 'draftId',
				sortable: true,
				advanced: false
			},
			{
				name: 'Example ID',
				selector: 'exampleId',
				sortable: true,
				advanced: true
			}
		],
		rows: [
			{
				draftId: 'mock-draft-id',
				exampleId: 'mock-example-id',
				completedAt: '2021-02-04T13:55:30.255Z'
			},
			{
				draftId: 'mock-draft-id2',
				exampleId: 'mock-example-id2',
				completedAt: '2021-06-21T15:32:30.255Z'
			}
		],
		tableName: 'Mock Table Name',
		csvFileName: 'mock-csv-file-name',
		filterSettings: {
			showIncompleteAttempts: false,
			showPreviewAttempts: false,
			showAdvancedFields: false
		},
		searchSettings: 'draft-id',
		searchContent: {
			text: 'mock',
			date: null
		}
	})

	test('DataGridScores renders correctly', () => {
		const component = renderer.create(<DataGridScores {...getTestProps()} />)

		const tree = component.toJSON()
		expect(tree).toMatchSnapshot()
	})

	test.each`
		showIncompleteAttempts | showPreviewAttempts | showAdvancedFields | expectedCSVFileName
		${false}               | ${false}            | ${false}           | ${'csv__mock-draft-id_mock-draft-id2'}
		${false}               | ${false}            | ${true}            | ${'csv-with-advanced-fields__mock-draft-id_mock-draft-id2'}
		${false}               | ${true}             | ${false}           | ${'csv-with-preview-attempts__mock-draft-id_mock-draft-id2'}
		${false}               | ${true}             | ${true}            | ${'csv-with-preview-attempts-with-advanced-fields__mock-draft-id_mock-draft-id2'}
		${true}                | ${false}            | ${false}           | ${'csv-with-incomplete-attempts__mock-draft-id_mock-draft-id2'}
		${true}                | ${false}            | ${true}            | ${'csv-with-incomplete-attempts-with-advanced-fields__mock-draft-id_mock-draft-id2'}
		${true}                | ${true}             | ${false}           | ${'csv-with-incomplete-attempts-with-preview-attempts__mock-draft-id_mock-draft-id2'}
		${true}                | ${true}             | ${true}            | ${'csv-with-incomplete-attempts-with-preview-attempts-with-advanced-fields__mock-draft-id_mock-draft-id2'}
	`(
		'getFileName({showIncompleteAttempts:$showIncompleteAttempts, showPreviewAttempts:$showPreviewAttempts, showAdvancedFields:$showAdvancedFields}) = "$expectedCSVFileName"',
		({ showIncompleteAttempts, showPreviewAttempts, showAdvancedFields, expectedCSVFileName }) => {
			const component = renderer.create(
				<DataGridScores
					{...getTestProps()}
					csvFileName="csv"
					filterSettings={{ showIncompleteAttempts, showPreviewAttempts, showAdvancedFields }}
				/>
			)
			expect(component.root.findByType('a').props.download).toBe(expectedCSVFileName)
		}
	)

	test.each`
		showIncompleteAttempts | showPreviewAttempts | expectedTableName
		${false}               | ${false}            | ${'Mock Table Name'}
		${false}               | ${true}             | ${'Mock Table Name (including preview attempts)'}
		${true}                | ${false}            | ${'Mock Table Name (including incomplete attempts)'}
		${true}                | ${true}             | ${'Mock Table Name (including incomplete and preview attempts)'}
	`(
		'getTableName({showIncompleteAttempts:$showIncompleteAttempts, showPreviewAttempts:$showPreviewAttempts) = "$expectedTableName"',
		({ showIncompleteAttempts, showPreviewAttempts, expectedTableName }) => {
			const component = renderer.create(
				<DataGridScores
					{...getTestProps()}
					filterSettings={{
						showIncompleteAttempts,
						showPreviewAttempts,
						showAdvancedFields: false
					}}
				/>
			)

			expect(
				component.root.findByProps({ className: 'react-data-table-component' }).props.title
			).toBe(expectedTableName)
		}
	)

	test('showAdvancedFields works as expected', () => {
		const component1 = renderer.create(
			<DataGridScores
				{...getTestProps()}
				filterSettings={{
					showIncompleteAttempts: false,
					showPreviewAttempts: false,
					showAdvancedFields: false
				}}
			/>
		)

		expect(
			component1.root.findByProps({ className: 'react-data-table-component' }).props.columns
		).toEqual([
			{
				name: 'Draft ID',
				selector: 'draftId',
				sortable: true,
				advanced: false
			}
		])

		const component2 = renderer.create(
			<DataGridScores
				{...getTestProps()}
				filterSettings={{
					showIncompleteAttempts: false,
					showPreviewAttempts: false,
					showAdvancedFields: true
				}}
			/>
		)

		expect(
			component2.root.findByProps({ className: 'react-data-table-component' }).props.columns
		).toEqual([
			{
				name: 'Draft ID',
				selector: 'draftId',
				sortable: true,
				advanced: false
			},
			{
				name: 'Example ID',
				selector: 'exampleId',
				sortable: true,
				advanced: true
			}
		])
	})

	test('DataGridScores creates a CSV as expected', () => {
		const component1 = renderer.create(
			<DataGridScores
				{...getTestProps()}
				filterSettings={{
					showIncompleteAttempts: false,
					showPreviewAttempts: false,
					showAdvancedFields: false
				}}
			/>
		)

		expect(component1.root.findByType('a').props.href).toMatchSnapshot()

		const component2 = renderer.create(
			<DataGridScores
				{...getTestProps()}
				filterSettings={{
					showIncompleteAttempts: false,
					showPreviewAttempts: false,
					showAdvancedFields: true
				}}
			/>
		)

		expect(component2.root.findByType('a').props.href).toMatchSnapshot()
	})

	test('DataGridScores renders when no rows given', () => {
		const component = renderer.create(
			<DataGridScores
				columns={[]}
				filterSettings={{
					showIncompleteAttempts: false,
					showPreviewAttempts: false,
					showAdvancedFields: false
				}}
				searchSettings={'course-title'}
				searchContent={{
					text: 'mock-course-title',
					date: { start: null, end: null }
				}}
			/>
		)

		expect(component.toJSON()).toMatchSnapshot()
	})

	test('DataGridScores renders one row', () => {
		const props = getTestProps()
		props.rows.pop()

		const component = renderer.create(<DataGridScores {...props} />)

		expect(component.toJSON()).toMatchSnapshot()
	})

	test('DataGridScores uses search filters as expected', () => {
		let props = {}
		Object.assign(props, getTestProps())
		props.rows = []

		const mockStartDate = new Date().getDate() - 1
		const mockEndDate = new Date()

		let component = renderer.create(
			<DataGridScores
				{...props}
				searchSettings={'course-title'}
				searchContent={{
					text: 'mock-course-title',
					date: { start: mockStartDate, end: mockEndDate }
				}}
			/>
		)

		// With no rows
		expect(component.toJSON()).toMatchSnapshot()

		// With at least 1 row
		props = getTestProps()
		component = renderer.create(
			<DataGridScores
				{...props}
				searchSettings={'course-title'}
				searchContent={{
					text: 'mock-course-title',
					date: { start: mockStartDate, end: mockEndDate }
				}}
			/>
		)
		expect(component.toJSON()).toMatchSnapshot()

		// With only a text parameter (e.g. student's first name)
		component = renderer.create(
			<DataGridScores
				{...props}
				searchSettings={'course-title'}
				searchContent={{
					text: 'mock-course-title',
					date: { start: null, end: null }
				}}
			/>
		)
		expect(component.toJSON()).toMatchSnapshot()

		// With only starting date parameter
		component = renderer.create(
			<DataGridScores
				{...props}
				searchSettings={'course-title'}
				searchContent={{
					text: '',
					date: { start: mockStartDate, end: null }
				}}
			/>
		)
		expect(component.toJSON()).toMatchSnapshot()

		// With only ending date parameter
		component = renderer.create(
			<DataGridScores
				{...props}
				searchSettings={'course-title'}
				searchContent={{
					text: '',
					date: { start: null, end: mockEndDate }
				}}
			/>
		)
		expect(component.toJSON()).toMatchSnapshot()

		// With only starting and ending date parameters
		component = renderer.create(
			<DataGridScores
				{...props}
				searchSettings={'course-title'}
				searchContent={{
					text: '',
					date: { start: mockStartDate, end: mockEndDate }
				}}
			/>
		)
		expect(component.toJSON()).toMatchSnapshot()

		// With both text and date parameters.
		component = renderer.create(
			<DataGridScores
				{...props}
				searchSettings={'course-title'}
				searchContent={{
					text: 'mock-course-title',
					date: { start: mockStartDate, end: mockEndDate }
				}}
			/>
		)
		expect(component.toJSON()).toMatchSnapshot()

		// Edge case where rows don't have the completedAt attribute
		props.rows = [
			{ draftId: 'mock-draft-id', exampleId: 'mock-example-id' },
			{ draftId: 'mock-draft-id2', exampleId: 'mock-example-id2' }
		]
		component = renderer.create(
			<DataGridScores
				{...props}
				searchSettings={'course-title'}
				searchContent={{
					text: 'mock-course-title',
					date: { start: mockStartDate, end: mockEndDate }
				}}
			/>
		)
		expect(component.toJSON()).toMatchSnapshot()
	})

	test('DataGridScores renders "null" in CSV exports where applicable', () => {
		const props = getTestProps()
		props.filterSettings.showAdvancedFields = true
		props.rows.pop()
		// Null the field we're not 'searching' by in the only row
		props.rows[0].exampleId = null

		const escapedRowString = escape(`"Draft ID","Example ID"\n"${props.rows[0].draftId}","null"`)
		const expectedUrlString = `data:text/csv;charset=utf-8,${escapedRowString}`

		const component = renderer.create(<DataGridScores {...props} />)
		expect(component.root.findByType(ButtonLink).props.url).toEqual(expectedUrlString)
	})

	test('DataGridScores filters rows correctly based on start/end dates', () => {
		// Shortcut function to get the filtered rows by checking the 'data' prop of the DataTable child
		// This is admittedly a bit of a hack, but it's far easier than any alternatives
		const getFilteredRows = component => {
			return component.root.findByProps({ className: 'data-grid' }).children[0].props.data
		}

		const mockStartDate = new Date()
		mockStartDate.setDate(mockStartDate.getDate() - 2)
		const mockEndDate = new Date()
		mockEndDate.setDate(mockEndDate.getDate() + 2)

		const firstDate = new Date()
		firstDate.setDate(firstDate.getDate() - 1)
		const secondDate = new Date()
		secondDate.setDate(secondDate.getDate() + 1)

		const props = getTestProps()
		props.rows = [
			{
				draftId: 'mock-draft-id',
				exampleId: 'mock-example-id',
				completedAt: firstDate
			},
			{
				draftId: 'mock-draft-id2',
				exampleId: 'mock-example-id2',
				completedAt: secondDate
			}
		]
		let component

		// First case - no dates
		component = renderer.create(<DataGridScores {...props} />)

		expect(getFilteredRows(component)).toEqual(props.rows)

		// Second case - both rows between start and end dates
		component = renderer.create(
			<DataGridScores
				{...props}
				searchContent={{
					date: { start: mockStartDate, end: mockEndDate }
				}}
			/>
		)

		expect(getFilteredRows(component)).toEqual(props.rows)

		// Third case - start date, no end date
		component = renderer.create(
			<DataGridScores
				{...props}
				searchContent={{
					date: { start: new Date() }
				}}
			/>
		)

		// Only the second row has a date after the start date
		expect(getFilteredRows(component)).toEqual([props.rows[1]])

		// Fourth case - end date, no start date
		component = renderer.create(
			<DataGridScores
				{...props}
				searchContent={{
					date: { end: new Date() }
				}}
			/>
		)

		// Only the first row has a date before the end date
		expect(getFilteredRows(component)).toEqual([props.rows[0]])
	})
})
