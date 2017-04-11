'use strict';

module.exports = function AutoIncrement(schema, options) {
	// default field name and default collection name
	let fieldName = 'sn';
	let collection = 'counters';
	let prefix = '';


	// if you pass options.field, will change your fieldName
	if (options && options.field) {
		fieldName = options.field;
	}

	// if you pass options.collection, will change your collection
	if (options && options.collection) {
		collection = options.collection;
	}

	// if you pass options.collection, will change your collection
	if (options && options.prefix) {
		prefix = options.prefix;
	}

	// make new field for schema
	const newField = {};
	newField[fieldName] = {
		type: String,
		index: true,
		unique: true
	};

	// schema add new field
	schema.add(newField);

	//
	schema.pre('save', function (next) {
		const doc = this;

		if (!doc.db || !doc.isNew || doc[fieldName] !== undefined) {
			return next();
		}

		const db = doc.db.db;
		const collectionName = doc.collection.name;

		db.collection(collection).findOneAndUpdate(
			{
				_id: collectionName
			},
			{
				$inc: {seq: 1}
			},
			{
				returnOriginal: false,
				upsert: true
			},
			function (err, result) {
				if (err) {
					return next(err);
				}
				doc[fieldName] = prefix + result.value.seq;
				return next();
			}
		);
	});
};
