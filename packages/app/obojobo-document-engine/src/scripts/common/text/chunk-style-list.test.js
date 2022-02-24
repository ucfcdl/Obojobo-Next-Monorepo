import ChunkStyleList from './chunk-style-list'
import StyleRange from './style-range'

describe('ChunkStyleList', function() {
	let styleList, styleRangeLink, styleRangeBold

	beforeEach(function() {
		styleList = new ChunkStyleList()
		styleRangeLink = new StyleRange(5, 15, 'a', { href: 'google.com' })
		styleRangeBold = new StyleRange(10, 20, 'b')
		// '01234<a>56789<b>012345</a>67890</b>'

		styleList.add(styleRangeLink)
		styleList.add(styleRangeBold)
	})

	test('clear empties an object', () => {
		const actual = new ChunkStyleList()
		actual.add(styleRangeLink)
		actual.add(styleRangeBold)

		expect(actual.length()).toEqual(2)

		actual.clear()

		expect(actual.length()).toEqual(0)
	})

	test('getExportedObject builds and returns an object', () => {
		const actual = styleList.getExportedObject()

		const expected = [
			{
				start: 5,
				end: 15,
				type: 'a',
				data: {
					href: 'google.com'
				}
			},
			{
				start: 10,
				end: 20,
				type: 'b',
				data: {}
			}
		]

		expect(actual).toEqual(expected)
	})

	test('getExportedObject returns null on empty object', () => {
		const actual = new ChunkStyleList()

		const expected = null

		expect(actual.getExportedObject()).toEqual(expected)
	})

	test('clone builds a copy', () => {
		const clone = styleList.clone()

		expect(clone).not.toBe(styleList)
		expect(clone.getExportedObject()).toEqual(styleList.getExportedObject())
	})

	test('length returns the nuber of styles', function() {
		expect(styleList.length()).toBe(2)
	})

	test('get returns the specified object', () => {
		const item = styleList.get(0)

		expect(item).toBe(styleRangeLink)
	})

	test('add inserts the given object', () => {
		const actual = new ChunkStyleList()

		expect(actual.length()).toEqual(0)

		actual.add(styleRangeLink)

		expect(actual.length()).toEqual(1)
		expect(actual.get(0)).toBe(styleRangeLink)
	})

	test('remove takes out ranges enscapsulated by a given range', () => {
		styleList.remove(new StyleRange(5, 20))

		expect(styleList.length()).toBe(0)
	})

	test('remove trims ranges overlapped by a given range', () => {
		styleList.remove(new StyleRange(0, 10))
		styleList.remove(new StyleRange(15, 20))

		expect(styleList.length()).toBe(2)

		styleList.styles.forEach(range => {
			if (range.type === 'a') {
				expect(range).toEqual(new StyleRange(10, 15, 'a', { href: 'google.com' }))
			} else {
				expect(range).toEqual(new StyleRange(10, 15, 'b'))
			}
		})
	})

	test('remove splits ranges that contain a given range', () => {
		//styleRangeLink = new StyleRange(5, 15, 'a', { href:'google.com' });
		//styleRangeBold = new StyleRange(10, 20, 'b');
		styleList.remove(new StyleRange(10, 11, 'a'))

		expect(styleList.getExportedObject()).toEqual([
			{
				type: 'b',
				start: 10,
				end: 20,
				data: {}
			},
			{
				type: 'a',
				start: 5,
				end: 10,
				data: { href: 'google.com' }
			},
			{
				type: 'a',
				start: 11,
				end: 15,
				data: { href: 'google.com' }
			}
		])
	})

	test('remove terminates ranges that match either end', () => {
		//styleRangeLink = new StyleRange(5, 15, 'a', { href:'google.com' });
		//styleRangeBold = new StyleRange(10, 20, 'b');
		styleList.remove(new StyleRange(10, 15, 'b'))

		expect(styleList.getExportedObject()).toEqual([
			{ data: {}, end: 20, start: 15, type: 'b' },
			{ data: { href: 'google.com' }, end: 15, start: 5, type: 'a' }
		])
	})

	test('getStyleComparisonsForRange returns styles ranges after a given range', () => {
		const comparisons = styleList.getStyleComparisonsForRange(0, 1, 'b')

		expect(comparisons.after.length).toBe(1)
		expect(comparisons.before.length).toBe(0)
		expect(comparisons.enscapsulatedBy.length).toBe(0)
		expect(comparisons.contains.length).toBe(0)
		expect(comparisons.left.length).toBe(0)
		expect(comparisons.right.length).toBe(0)

		expect(comparisons.after[0]).toBe(styleRangeBold)
	})

	test('getStyleComparisonsForRange returns styles ranges before a given range', () => {
		const comparisons = styleList.getStyleComparisonsForRange(21, 22, 'b')

		expect(comparisons.after.length).toBe(0)
		expect(comparisons.before.length).toBe(1)
		expect(comparisons.enscapsulatedBy.length).toBe(0)
		expect(comparisons.contains.length).toBe(0)
		expect(comparisons.left.length).toBe(0)
		expect(comparisons.right.length).toBe(0)

		expect(comparisons.before[0]).toBe(styleRangeBold)
	})

	test('getStyleComparisonsForRange returns styles ranges enscapsulated by a given range', () => {
		const comparisons = styleList.getStyleComparisonsForRange(0, 20, 'b')

		expect(comparisons.after.length).toBe(0)
		expect(comparisons.before.length).toBe(0)
		expect(comparisons.enscapsulatedBy.length).toBe(1)
		expect(comparisons.contains.length).toBe(0)
		expect(comparisons.left.length).toBe(0)
		expect(comparisons.right.length).toBe(0)

		expect(comparisons.enscapsulatedBy[0]).toBe(styleRangeBold)
	})

	test('getStyleComparisonsForRange returns styles ranges containing a given range', () => {
		const comparisons = styleList.getStyleComparisonsForRange(11, 20, 'b')

		expect(comparisons.after.length).toBe(0)
		expect(comparisons.before.length).toBe(0)
		expect(comparisons.enscapsulatedBy.length).toBe(0)
		expect(comparisons.contains.length).toBe(1)
		expect(comparisons.left.length).toBe(0)
		expect(comparisons.right.length).toBe(0)

		expect(comparisons.contains[0]).toBe(styleRangeBold)
	})

	test('getStyleComparisonsForRange returns styles ranges within the left side of a given range', () => {
		const comparisons = styleList.getStyleComparisonsForRange(20, 21, 'b')

		expect(comparisons.after.length).toBe(0)
		expect(comparisons.before.length).toBe(0)
		expect(comparisons.enscapsulatedBy.length).toBe(0)
		expect(comparisons.contains.length).toBe(0)
		expect(comparisons.left.length).toBe(1)
		expect(comparisons.right.length).toBe(0)

		expect(comparisons.left[0]).toBe(styleRangeBold)
	})

	test('getStyleComparisonsForRange returns styles ranges within the right side of a given range', () => {
		const comparisons = styleList.getStyleComparisonsForRange(0, 11, 'b')

		expect(comparisons.after.length).toBe(0)
		expect(comparisons.before.length).toBe(0)
		expect(comparisons.enscapsulatedBy.length).toBe(0)
		expect(comparisons.contains.length).toBe(0)
		expect(comparisons.left.length).toBe(0)
		expect(comparisons.right.length).toBe(1)

		expect(comparisons.right[0]).toBe(styleRangeBold)
	})

	test('getStyleComparisonsForRange returns all styles range comparisons when no type is specified', () => {
		const comparisons = styleList.getStyleComparisonsForRange(0, 15)

		expect(comparisons.after.length).toBe(0)
		expect(comparisons.before.length).toBe(0)
		expect(comparisons.enscapsulatedBy.length).toBe(1)
		expect(comparisons.contains.length).toBe(0)
		expect(comparisons.left.length).toBe(0)
		expect(comparisons.right.length).toBe(1)

		expect(comparisons.enscapsulatedBy[0]).toBe(styleRangeLink)
		expect(comparisons.right[0]).toBe(styleRangeBold)
	})

	test('getStyleComparisonsForRange returns only styles at from when to is not specified', () => {
		const comparisons = styleList.getStyleComparisonsForRange(0)

		expect(comparisons.after.length).toBe(2)
		expect(comparisons.before.length).toBe(0)
		expect(comparisons.enscapsulatedBy.length).toBe(0)
		expect(comparisons.contains.length).toBe(0)
		expect(comparisons.left.length).toBe(0)
		expect(comparisons.right.length).toBe(0)
	})

	test('rangeHasStyle returns if range is specified style', () => {
		const hasStyle = styleList.rangeHasStyle(6, 11, 'a')

		expect(hasStyle).toEqual(true)
	})

	test('normalizes similar ranges', function() {
		const newStyleRange = new StyleRange(5, 15, 'b')
		styleList.add(newStyleRange)
		styleList.normalize()

		expect(styleList.length()).toBe(2)

		styleList.styles.forEach(range => {
			if (range.type === 'b') {
				expect(range).toEqual(new StyleRange(5, 20, 'b'))
			}
		})
	})

	test("doesn't normalize dis-similar ranges", function() {
		const newStyleRange = new StyleRange(0, 20, 'a', {
			href: 'new-website.com'
		})
		styleList.add(newStyleRange)
		styleList.normalize()

		expect(styleList.length()).toBe(3)

		expect(styleList.getExportedObject()).toEqual([
			{
				start: 10,
				end: 20,
				type: 'b',
				data: {}
			},
			{
				start: 0,
				end: 20,
				type: 'a',
				data: {
					href: 'new-website.com'
				}
			},
			{
				start: 5,
				end: 15,
				type: 'a',
				data: {
					href: 'google.com'
				}
			}
		])
	})

	test('normalizes unexpected styles', () => {
		styleList = new ChunkStyleList()

		styleList.add(new StyleRange(0, 5, 'b', {}))
		styleList.add(new StyleRange(0, 5, 'extra', {}))
		styleList.add(new StyleRange(0, 5, 'u', { prop: 'val1' }))
		styleList.add(new StyleRange(5, 10, 'u', {}))
		styleList.add(new StyleRange(5, 10, 'extra', {}))
		styleList.normalize()

		expect(styleList.getExportedObject()).toEqual([
			{
				start: 0,
				end: 5,
				type: 'b',
				data: {}
			},
			{
				start: 0,
				end: 10,
				type: 'extra',
				data: {}
			},
			{
				start: 5,
				end: 10,
				type: 'u',
				data: {}
			},
			{
				start: 0,
				end: 5,
				type: 'u',
				data: {
					prop: 'val1'
				}
			}
		])
	})

	test('getStylesInRange returns styles completely within a given range', () => {
		const styles = styleList.getStylesInRange(5, 15)

		expect(Object.keys(styles).length).toBe(1)
		expect(styles['a']).toBe('a')
	})

	test("getStylesInRange doesn't return styles that don't fill a given range", () => {
		const styles = styleList.getStylesInRange(0, 15)

		expect(styles).toEqual({})
	})

	test('getStyles returns all styles', () => {
		const styles = styleList.getStyles()

		expect(Object.keys(styles).length).toBe(2)
		expect(styles['a']).toBe('a')
		expect(styles['b']).toBe('b')
	})

	test('cleanupSuperscripts cleans up superscripts', () => {
		const styleList2 = new ChunkStyleList()
		const sub1 = new StyleRange(5, 10, 'sup', 3)
		const sub2 = new StyleRange(5, 10, 'sup', -3)
		const sub3 = new StyleRange(15, 20, 'sup', 3)
		const sub4 = new StyleRange(15, 20, 'sup', -2)

		styleList2.add(sub1)
		styleList2.add(sub2)
		styleList2.add(sub3)
		styleList2.add(sub4)

		styleList2.cleanupSuperscripts()

		expect(styleList2.length()).toBe(1)
		expect(styleList2.styles[0]).toEqual(new StyleRange(15, 20, 'sup', 1))
	})

	test('createFromObject imports an object', function() {
		styleList = ChunkStyleList.createFromObject([
			{
				start: 10,
				end: 20,
				type: 'a',
				data: { href: 'website.net' }
			}
		])

		expect(styleList.styles.length).toEqual(1)
		expect(styleList.styles[0]).toEqual(new StyleRange(10, 20, 'a', { href: 'website.net' }))
	})

	test('createFromObject creates a default object', function() {
		styleList = ChunkStyleList.createFromObject(null)

		expect(styleList.styles.length).toEqual(0)
	})
})
