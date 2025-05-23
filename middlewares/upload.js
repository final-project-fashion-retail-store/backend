// middleware/uploadMiddleware.js
const multer = require('multer');
const DatauriParser = require('datauri/parser');
const path = require('node:path');

// Multer storage: We don't need to save files to disk
// because we'll be uploading them directly to Cloudinary
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const parser = new DatauriParser();

const formatBufferToDataUri = (file) => {
	return parser.format(path.extname(file.originalname).toString(), file.buffer);
};

module.exports = { upload, formatBufferToDataUri };
