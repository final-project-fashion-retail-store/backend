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
	'/related/:productSlug',
	productController.getProductBySlug,
	productController.getRelatedProducts
);

router.get('/best-selling', productController.getBestSellingProducts);

// router.use(authController.protect);

router
	.route('/admin')
	.get(
		authController.protect,
		authController.restrictTo('admin', 'staff'),
		productController.getAllProducts
	)
	.post(
		authController.protect,
		authController.restrictTo('admin', 'staff'),
		productController.createProduct
	);

router
	.route('/admin/:id')
	.get(
		authController.protect,
		authController.restrictTo('admin', 'staff'),
		productController.getProduct
	)
	.patch(
		authController.protect,
		authController.restrictTo('admin', 'staff'),
		productController.updateProduct
	)
	.delete(
		authController.protect,
		authController.restrictTo('admin', 'staff'),
		productController.deleteProduct
	);

router.get(
	'/:productSlug',
	productController.getProductBySlug,
	productController.sendProduct
);

module.exports = router;
