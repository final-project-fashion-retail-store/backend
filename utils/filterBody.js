const filteredBody = (bodyObj, ...disallowedFields) => {
	const newObj = { ...bodyObj };
	disallowedFields.forEach((field) => delete newObj[field]);

	return newObj;
};

module.exports = filteredBody;
