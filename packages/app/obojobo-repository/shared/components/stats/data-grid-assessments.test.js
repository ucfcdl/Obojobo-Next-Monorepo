import React from 'react'
import renderer from 'react-test-renderer'
import DataGridAssessments from './data-grid-assessments'

jest.mock('react-data-table-component', () => ({
	default: props => (
		<div {...props} className="react-data-table-component">
			react-data-table-component
		</div>
	)
}))

describe('DataGridAssessments', () => {
	const getTestProps = () => ({
		attempts: [
			{
				draftId: 'mock-draft-id',
				exampleId: 'mock-example-id',
				launchPresentationReturnUrl: 'mock-url',
				highestAssessmentScore: null,
				isPreview: false
			},
			{
				draftId: 'mock-draft-id2',
				exampleId: 'mock-example-id2',
				launchPresentationReturnUrl: 'mock-url',
				highestAssessmentScore: 0,
				isPreview: true
			}
		],
		controls: {
			showIncompleteAttempts: false,
			showPreviewAttempts: false,
			showAdvancedFields: false,
			searchBy: 'draft-id',
			searchContent: {
				searchString: 'mock',
				date: null
			}
		},
		setFilteredRows: () => {}
	})

	test('DataGridAssessments renders correctly', () => {
		const component = renderer.create(<DataGridAssessments {...getTestProps()} />)

		const tree = component.toJSON()
		expect(tree).toMatchSnapshot()
	})

	test('DataGridAssessments renders without attempts', () => {
		const component = renderer.create(
			<DataGridAssessments
				controls={{
					showIncompleteAttempts: false,
					showPreviewAttempts: false,
					showAdvancedFields: false,
					searchBy: 'draft-id',
					searchContent: {
						searchString: 'mock',
						date: null
					}
				}}
			/>
		)

		const tree = component.toJSON()
		expect(tree).toMatchSnapshot()
	})

	test('DataGridAssessments columns with cell components render as expected', () => {
		const props = {
			...getTestProps(),
			controls: {
				showIncompleteAttempts: true,
				showPreviewAttempts: true,
				showAdvancedFields: true,
				searchBy: 'draft-id',
				searchContent: {
					searchString: 'mock',
					date: null
				}
			}
		}

		const component = renderer.create(<DataGridAssessments {...props} />)
		const columns = component.root.findByProps({ className: 'react-data-table-component' }).props
			.columns

		columns.forEach(col => {
			if (col.cell) {
				expect(
					col.cell({
						draftId: 'mock-draft-id',
						exampleId: 'mock-example-id',
						launchPresentationReturnUrl: 'mock-url',
						highestAssessmentScore: null,
						isPreview: false
					})
				).toMatchSnapshot()
			}
		})
	})
})
