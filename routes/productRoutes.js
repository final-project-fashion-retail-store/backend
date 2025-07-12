const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const productController = require('../controllers/productController');

router.route('/').get(productController.getAllProducts);

router.get(
	'/category/:categorySlug',
	productController.getProductsByCategory,
	productController.sendCategoryProducts
);
router
	.route('/category/:categorySlug/subcategory/:subcategorySlug')
	.get(
		productController.getProductsBySubcategory,
		productController.sendSubcategoryProducts
	);

router.get(
	'/search/popup',
	productController.searchPopup,
	productController.sendSearchPopupResults
);

router.get(
	'/search',
	productController.getProductsBySearch,
	productController.sendSearchProducts
);

router.get(
	'/brand/:brandSlug',
	productController.getProductsByBrand,
	productController.sendBrandProducts
);

router.get(
	'/:productSlug',
	productController.getProductBySlug,
	productController.sendProduct
);

router.get(
	'/related/:productSlug',
	productController.getProductBySlug,
	productController.getRelatedProducts
);

router.use(authController.protect);

router
	.route('/admin')
	.get(
		authController.restrictTo('admin', 'staff'),
		productController.getAllProducts
	)
	.post(
		authController.restrictTo('admin', 'staff'),
		productController.createProduct
	);

router
	.route('/:id')
	.get(authController.restrictTo('admin', 'staff'), productController.getProduct)
	.patch(
		authController.restrictTo('admin', 'staff'),
		productController.updateProduct
	)
	.delete(
		authController.restrictTo('admin', 'staff'),
		productController.deleteProduct
	);

module.exports = router;
