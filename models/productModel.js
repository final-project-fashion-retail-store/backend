const mongoose = require('mongoose');
const slugify = require('slugify');
const { Schema } = mongoose;

const Brand = require('./brandModel');
const Cart = require('./cartModel');

const ImageSchema = new mongoose.Schema(
	{
		public_id: {
			type: String,
			default: '',
		},
		url: {
			type: String,
			default: '',
		},
	},
	{ _id: false }
);

const VariantSchema = new Schema({
	sku: { type: String, required: true, unique: true },
	color: { type: String, required: true },
	size: { type: String, required: true },
	price: { type: Number, required: true },
	salePrice: Number,
	inventory: { type: Number, required: true, min: 0 },
	reservedInventory: { type: Number, default: 0 },
});

const ProductSchema = new Schema(
	{
		name: { type: String, required: true },
		slug: { type: String, unique: true },
		description: String,
		shortDescription: String,
		importPrice: { type: Number, required: true },
		price: { type: Number, required: true },
		salePrice: Number,
		category: { type: Schema.Types.ObjectId, ref: 'Subcategory', required: true },
		brand: { type: Schema.Types.ObjectId, ref: 'Brand', required: true },
		images: {
			type: [ImageSchema],
			default: [],
		},
		colorImages: {
			type: Map,
			of: [ImageSchema],
			default: {},
		},
		tags: [String],
		gender: { type: String, enum: ['Men', 'Women'] },
		season: {
			type: String,
			enum: ['Spring', 'Summer', 'Fall', 'Winter', 'All Season'],
		},
		material: [String],
		careInstructions: String,

		variants: [VariantSchema],
		active: { type: Boolean, default: true },
		inStock: { type: Boolean, default: true },
		featuredProduct: { type: Boolean, default: false },
		averageRating: {
			type: Number,
			default: 0,
			min: 0,
			max: 5,
			set: (val) => Math.round(val * 10) / 10,
		},
		totalReviews: { type: Number, default: 0, min: 0 },

		// SEO fields
		metaTitle: String,
		metaDescription: String,
	},
	{
		timestamps: true,
		toJSON: {
			virtuals: true,
			transform: function (doc, ret) {
				delete ret.id;
				return ret;
			},
		},
		toObject: {
			virtuals: true,
			transform: function (doc, ret) {
				delete ret.id;
				return ret;
			},
		},
	}
);

ProductSchema.index({ category: 1 });
ProductSchema.index({ isActive: 1 });
ProductSchema.index({ featuredProduct: 1 });
ProductSchema.index({ tags: 1 });
ProductSchema.index({ gender: 1, category: 1 });
ProductSchema.index({ createdAt: -1 });

ProductSchema.pre('save', function (next) {
	if (!this.slug || this.isModified('name')) {
		this.slug = slugify(this.name, { lower: true, strict: true });
	}
	next();
});

ProductSchema.post('save', async function (doc, next) {
	if ((this.isNew || !doc._skipBrandUpdate) && !doc._skipBrandUpdate) {
		await Brand.findByIdAndUpdate(doc.brand, { $inc: { productNum: 1 } });
	}
	next();
});

ProductSchema.post('findOneAndDelete', async function (doc, next) {
	if (doc) {
		await Brand.findByIdAndUpdate(doc.brand, { $inc: { productNum: -1 } });

		await Cart.updateMany(
			{ 'items.product': doc._id },
			{ $pull: { items: { product: doc._id } } }
		);
	}
	next();
});

const Product = mongoose.model('Product', ProductSchema);
module.exports = Product;
