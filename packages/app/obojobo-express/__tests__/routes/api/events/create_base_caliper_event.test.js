import BaseEvent from '../../../../server/routes/api/events/create_base_caliper_event'
import Event from 'caliper-js-public/src/events/event'
import iriFactory from '../../../../server/iri_builder'

const { ACTOR_SERVER_APP } = oboRequire('server/routes/api/events/caliper_constants')

describe('Base Caliper Event', () => {
	test('createEvent builds basic Caliper Event', () => {
		const IRI = iriFactory(null, 'mockhost')
		const event = BaseEvent.createEvent(Event, { type: ACTOR_SERVER_APP }, IRI, {})

		expect(event).toEqual({
			'@context': 'http://purl.imsglobal.org/ctx/caliper/v1p1',
			'@type': 'Event',
			action: null,
			actor: 'https://mockhost/api/server',
			edApp: 'https://mockhost/api/system',
			eventTime: expect.any(String),
			extensions: {},
			federatedSession: null,
			generated: null,
			group: null,
			id: 'urn:uuid:DEADBEEF-0000-DEAD-BEEF-1234DEADBEEF',
			membership: null,
			object: null,
			target: null
		})
	})
})
