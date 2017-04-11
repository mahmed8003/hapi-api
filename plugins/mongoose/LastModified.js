'use strict';

module.exports = function lastModifiedPlugin (schema, options) {
	schema.add({ createdAt: Date});
	schema.add({ updatedAt: Date});

	if (options && options.indexCreatedAt) {
		schema.path('createdAt').index(options.indexCreatedAt);
	}

	if (options && options.indexUpdatedAt) {
		schema.path('updatedAt').index(options.indexUpdatedAt);
	}

	schema.pre('save', function (next) {
		const doc = this;
		const now = Date.now();
		if(doc.isNew) {
			this.createdAt = now;
		}
		this.updatedAt = now;
		next();
	});
};
