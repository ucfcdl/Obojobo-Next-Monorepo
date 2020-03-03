'use strict'

let dbm
let type
let seed

/**
 * We receive the dbmigrate dependency from dbmigrate initially.
 * This enables us to not have to rely on NODE_PATH.
 */
exports.setup = function(options, seedLink) {
	dbm = options.dbmigrate
	type = dbm.dataType
	seed = seedLink
}

exports.up = function(db) {
	return db.removeColumn('launches', 'link')
}

exports.down = function(db) {
	return db.addColumn('launches', 'link', {
		type: 'varchar',
		length: 500,
		notNull: false
	})
}

exports._meta = {
	version: 2
}
