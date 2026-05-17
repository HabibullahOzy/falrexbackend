const Product  = require("../models/Product");
const cloudinary = require("../config/cloudinary");




exports.createProduct = async (req, res) => {
  try {
    const body = req.body;

    const specifications = body.specifications ? JSON.parse(body.specifications) : {};
    const tags           = body.tags           ? JSON.parse(body.tags)           : [];
    const variations     = body.variations     ? JSON.parse(body.variations)     : [];

    // ✅ From middleware (already uploaded to Cloudinary)
    const images = req.uploadedImages || [];
    const video  = req.uploadedVideo  || null;

    const product = await Product.create({
      ...body,
      specifications,
      tags,
      variations,
      images,
      video,
    });

    res.status(201).json({ success: true, data: product });

  } catch (err) {
    console.error("❌ createProduct error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


// ── CREATE ──────────────────────────────────────────────────────
// exports.createProduct = async (req, res) => {
//   try {
//     const body = req.body;

//     // Parse JSON strings sent from FormData
//     const specifications = body.specifications
//       ? JSON.parse(body.specifications) : {};
//     const tags       = body.tags       ? JSON.parse(body.tags)       : [];
//     const variations = body.variations ? JSON.parse(body.variations) : [];

//     // Collect Cloudinary image URLs
//     const images = (req.files?.images || []).map((f) => ({
//       url:       f.path,          // Cloudinary URL
//       public_id: f.filename,      // Cloudinary public_id
//     }));

//     // Collect video URL
//     const videoFile = req.files?.video?.[0];
//     const video = videoFile
//       ? { url: videoFile.path, public_id: videoFile.filename }
//       : null;

//     const product = await Product.create({
//       ...body,
//       specifications,
//       tags,
//       variations,
//       images,
//       video,
//     });

//     res.status(201).json({ success: true, data: product });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// ── READ ALL ─────────────────────────────────────────────────────
exports.getAllProducts = async (req, res) => {
  try {
    // Supports: ?category=Electronics&page=1&limit=10
    const { category, page = 1, limit = 20, search } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (search)   filter.$text = { $search: search };

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Product.countDocuments(filter);

    res.json({ success: true, total, page: Number(page), data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── READ ONE ─────────────────────────────────────────────────────
// exports.getProductById = async (req, res) => {
//   try {
//     const product = await Product.findById(req.params.id);
//     if (!product)
//       return res.status(404).json({ success: false, message: "Not found" });
//     res.json({ success: true, data: product });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET BY CATEGORY ──────────────────────────────────────────────────────────
exports.getProductBycategory = async (req, res) => {
  try {
    const { category } = req.params;

    const products = await Product.find({
      category: { $regex: new RegExp(category, "i") }, // case-insensitive match
    }).sort({ createdAt: -1 });

    if (!products.length) {
      return res.status(404).json({
        success: false,
        message: `No products found in category: ${category}`,
      });
    }

    res.json({ success: true, total: products.length, data: products });
  } catch (err) {
    console.error("getProductBycategory error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /product/subsubcategory/:subSubcategory
exports.getProductBySubsubcategory = async (req, res) => {
  try {
    const { subSubcategory } = req.params;
    const { page = 1, limit = 24 } = req.query;

    // const query = { subSubcategory: subSubcategory };

    const products = await Product.find({
      subSubcategory: { $regex: new RegExp(subSubcategory, "i") },
    })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    if (!products.length)
      return res.status(404).json({ success: false, message: "No products found" });

    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// // ── UPDATE ───────────────────────────────────────────────────────
// exports.updateProduct = async (req, res) => {
//   try {
//     const body = req.body;

//     const updateData = { ...body };

//     if (body.specifications)
//       updateData.specifications = JSON.parse(body.specifications);
//     if (body.tags)
//       updateData.tags = JSON.parse(body.tags);
//     if (body.variations)
//       updateData.variations = JSON.parse(body.variations);

//     // If new images uploaded, append them
//     if (req.files?.images) {
//       const newImages = req.files.images.map((f) => ({
//         url: f.path, public_id: f.filename,
//       }));
//       updateData.$push = { images: { $each: newImages } };
//     }

//     const product = await Product.findByIdAndUpdate(
//       req.params.id,
//       updateData,
//       { new: true, runValidators: true }
//     );

//     if (!product)
//       return res.status(404).json({ success: false, message: "Not found" });

//     res.json({ success: true, data: product });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };



// ── UPDATE ─────────────────────────────────────────────────────────────────
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });

    const body       = req.body;
    const updateData = { ...body };

    // Parse JSON strings
    if (body.specifications) {
      try { updateData.specifications = JSON.parse(body.specifications); }
      catch { delete updateData.specifications; }
    }
    if (body.tags) {
      try { updateData.tags = JSON.parse(body.tags); }
      catch { updateData.tags = []; }
    }
    if (body.variations) {
      try { updateData.variations = JSON.parse(body.variations); }
      catch { updateData.variations = []; }
    }

    // ── Handle image deletions ────────────────────────────────────────────
    // Client sends: deleteImages = JSON array of public_ids to remove
    if (body.deleteImages) {
      let toDelete = [];
      try { toDelete = JSON.parse(body.deleteImages); } catch {}

      if (toDelete.length > 0) {
        // Delete from Cloudinary
        await Promise.all(
          toDelete.map((public_id) =>
            cloudinary.uploader.destroy(public_id).catch(() => {})
          )
        );
        // Remove from product
        updateData.images = product.images.filter(
          (img) => !toDelete.includes(img.public_id)
        );
      } else {
        updateData.images = product.images;
      }
    }

    // ── Handle video deletion ─────────────────────────────────────────────
    if (body.deleteVideo === "true" && product.video?.public_id) {
      await cloudinary.uploader.destroy(product.video.public_id, {
        resource_type: "video",
      }).catch(() => {});
      updateData.video = null;
    }

    // ── Append new uploaded images ────────────────────────────────────────
    if (req.uploadedImages && req.uploadedImages.length > 0) {
      const existingImages = updateData.images || product.images || [];
      updateData.images    = [...existingImages, ...req.uploadedImages];
    }

    // ── Replace video if new one uploaded ─────────────────────────────────
    if (req.uploadedVideo) {
      // Delete old video from Cloudinary if exists
      if (product.video?.public_id) {
        await cloudinary.uploader.destroy(product.video.public_id, {
          resource_type: "video",
        }).catch(() => {});
      }
      updateData.video = req.uploadedVideo;
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({ success: true, data: updated, message: "Product updated successfully" });
  } catch (err) {
    console.error("updateProduct error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE SINGLE IMAGE ────────────────────────────────────────────────────
exports.deleteProductImage = async (req, res) => {
  try {
    const { id, public_id } = req.params;
    const decodedPublicId   = decodeURIComponent(public_id);

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(decodedPublicId).catch(() => {});

    // Remove from product
    const product = await Product.findByIdAndUpdate(
      id,
      { $pull: { images: { public_id: decodedPublicId } } },
      { new: true }
    );

    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });

    res.json({ success: true, data: product, message: "Image deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE VIDEO ───────────────────────────────────────────────────────────
exports.deleteProductVideo = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });

    if (product.video?.public_id) {
      await cloudinary.uploader.destroy(product.video.public_id, {
        resource_type: "video",
      }).catch(() => {});
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { video: null } },
      { new: true }
    );

    res.json({ success: true, data: updated, message: "Video deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE ───────────────────────────────────────────────────────
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res.status(404).json({ success: false, message: "Not found" });

    // Delete images from Cloudinary
    for (const img of product.images) {
      if (img.public_id)
        await cloudinary.uploader.destroy(img.public_id);
    }

    // Delete video from Cloudinary
    if (product.video?.public_id)
      await cloudinary.uploader.destroy(product.video.public_id, {
        resource_type: "video",
      });

    await product.deleteOne();

    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE SINGLE IMAGE ──────────────────────────────────────────
exports.deleteImage = async (req, res) => {
  try {
    const { id, public_id } = req.params;

    await cloudinary.uploader.destroy(public_id);

    const product = await Product.findByIdAndUpdate(
      id,
      { $pull: { images: { public_id } } },
      { returnDocument: 'after' }
    );

    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};





  // ── SEARCH PRODUCTS ────────────────────────────────────────────────────────
// GET /product/search?q=keyword&limit=8
exports.searchProducts = async (req, res) => {
  try {
    const { q = "", limit = 8, category, subcategory } = req.query;

    if (!q.trim()) {
      return res.json({ success: true, data: [], total: 0 });
    }

    const filter = {
      $or: [
        { nameEng:        { $regex: new RegExp(q, "i") } },
        { brand:          { $regex: new RegExp(q, "i") } },
        { sku:            { $regex: new RegExp(q, "i") } },
        { modelNumber:    { $regex: new RegExp(q, "i") } },
        { category:       { $regex: new RegExp(q, "i") } },
        { subcategory:    { $regex: new RegExp(q, "i") } },
        { supplierName:   { $regex: new RegExp(q, "i") } },
        { tags:           { $in: [new RegExp(q, "i")] } },
        { shortDescription: { $regex: new RegExp(q, "i") } },
      ],
    };

    if (category)    filter.category    = { $regex: new RegExp(`^${category}$`, "i") };
    if (subcategory) filter.subcategory = { $regex: new RegExp(`^${subcategory}$`, "i") };

    const products = await Product.find(filter)
      .limit(Number(limit))
      .select(
        "nameEng brand sku slug category subcategory subSubcategory " +
        "price currency discount images avgRating totalReviews " +
        "supplierName stock moq"
      )
      .sort({ avgRating: -1, createdAt: -1 });

    const total = await Product.countDocuments(filter);

    // Search suggestions — unique categories + brands that match
    const categories = await Product.distinct("category", {
      category: { $regex: new RegExp(q, "i") },
    });
    const brands = await Product.distinct("brand", {
      brand: { $regex: new RegExp(q, "i") },
    });

    return res.json({
      success: true,
      total,
      data:        products,
      suggestions: {
        categories: categories.slice(0, 4),
        brands:     brands.slice(0, 4),
      },
    });
  } catch (err) {
    console.error("searchProducts error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET TRENDING / POPULAR (for empty search state) ───────────────────────
// GET /product/trending?limit=6
exports.getTrendingProducts = async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    const products = await Product.find({ stock: { $gt: 0 } })
      .sort({ totalReviews: -1, avgRating: -1 })
      .limit(Number(limit))
      .select(
        "nameEng brand category images price currency discount " +
        "avgRating totalReviews sku slug"
      );

    return res.json({ success: true, data: products });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};



// ── GET PRODUCTS BY CATEGORY WITH FILTERS ─────────────────────────────────
// GET /product/filter
exports.getProductsByFilter = async (req, res) => {
  try {
    const {
      category, subcategory, subSubcategory,
      minPrice, maxPrice, sort = "newest",
      page = 1, limit = 20,
      search, inStock, currency,
    } = req.query;

    const filter = {};

    // Category filters
    if (category)       filter.category       = { $regex: new RegExp(`^${category}$`, "i") };
    if (subcategory)    filter.subcategory    = { $regex: new RegExp(`^${subcategory}$`, "i") };
    if (subSubcategory) filter.subSubcategory = { $regex: new RegExp(`^${subSubcategory}$`, "i") };

    // Price filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Search
    if (search) {
      filter.$or = [
        { nameEng:      { $regex: new RegExp(search, "i") } },
        { brand:        { $regex: new RegExp(search, "i") } },
        { description:  { $regex: new RegExp(search, "i") } },
        { tags:         { $in: [new RegExp(search, "i")] } },
      ];
    }

    // Stock filter
    if (inStock === "true") filter.stock = { $gt: 0 };

    // Currency filter
    if (currency) filter.currency = { $regex: new RegExp(currency, "i") };

    // Sort
    const sortMap = {
      newest:     { createdAt: -1 },
      oldest:     { createdAt:  1 },
      priceAsc:   { price:      1 },
      priceDesc:  { price:     -1 },
      nameAsc:    { nameEng:    1 },
      popular:    { totalReviews: -1, avgRating: -1 },
    };
    const sortQuery = sortMap[sort] || sortMap.newest;

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .sort(sortQuery)
      .skip(skip)
      .limit(Number(limit))
      .select(
        "nameEng brand price currency discount moq stock category subcategory " +
        "subSubcategory images supplierName countryOfOrigin avgRating totalReviews " +
        "tags shortDescription createdAt"
      );

    // Get unique subcategories & sub-subcategories for this category
    const subCats = category
      ? await Product.distinct("subcategory", {
          category: { $regex: new RegExp(`^${category}$`, "i") },
          subcategory: { $ne: "" },
        })
      : [];

    const subSubCats = subcategory
      ? await Product.distinct("subSubcategory", {
          category:    { $regex: new RegExp(`^${category}$`, "i") },
          subcategory: { $regex: new RegExp(`^${subcategory}$`, "i") },
          subSubcategory: { $ne: "" },
        })
      : [];

    // Price range for this filter
    const priceAgg = await Product.aggregate([
      { $match: { ...filter, price: { $exists: true, $gt: 0 } } },
      { $group: { _id: null, min: { $min: "$price" }, max: { $max: "$price" } } },
    ]);
    const priceRange = priceAgg[0] || { min: 0, max: 100000 };

    return res.json({
      success: true,
      total,
      page:    Number(page),
      pages:   Math.ceil(total / Number(limit)),
      data:    products,
      meta: {
        subCategories:    subCats.filter(Boolean).sort(),
        subSubCategories: subSubCats.filter(Boolean).sort(),
        priceRange,
      },
    });
  } catch (err) {
    console.error("getProductsByFilter error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};



// routes: GET /product/category/:slug
exports.getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    // slug could be "consumer-electronics" → convert to "Consumer Electronics"
    // OR store slug directly in your Category model (recommended)
    
    // Option A: if your Category model has a `slug` field
    const Category = require("../models/Category"); // adjust path
    const category = await Category.findOne({ slug }).lean();
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    return res.json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
