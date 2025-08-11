// middlewares/mongoSanitize.js
function stripDangerousKeys(obj) {
	if (!obj || typeof obj !== 'object') return;

	if (Array.isArray(obj)) {
		for (let i = 0; i < obj.length; i++) stripDangerousKeys(obj[i]);
		return;
	}

	for (const key of Object.keys(obj)) {
		if (key.startsWith('$') || key.includes('.')) {
			delete obj[key]; // or rename: obj[key.replace(/\$|\./g, '_')] = obj[key]
			continue;
		}
		stripDangerousKeys(obj[key]);
	}
}

module.exports = function mongoSanitizeMiddleware(req, _res, next) {
	if (req.body) stripDangerousKeys(req.body);
	if (req.params) stripDangerousKeys(req.params);
	// IMPORTANT: do NOT reassign req.query on Express 5; mutate in place
	if (req.query) stripDangerousKeys(req.query);
	next();
};
