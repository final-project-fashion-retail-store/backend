const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const imageController = require('../controllers/imageController');
const { upload } = require('../middlewares/upload');
const { uploadImages, destroyImage } = require('../middlewares/image');

router.use(authController.protect);
router
	.route('/')
	.post(upload.array('images', 10), uploadImages, imageController.uploadImage)
	.delete(destroyImage, imageController.destroyImage);

module.exports = router;
