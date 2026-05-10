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
// exports.getProductBySubsubcategory = async (req, res) => {
//   try {
//     const { subSubcategory } = req.params;
//     const { page = 1, limit = 24 } = req.query;

//     const query = { subSubcategory: subSubcategory };

//     const products = await Product.find(query)
//       .skip((page - 1) * limit)
//       .limit(Number(limit));

//     if (!products.length)
//       return res.status(404).json({ success: false, message: "No products found" });

//     res.json({ success: true, data: products });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };


// ── UPDATE ───────────────────────────────────────────────────────
exports.updateProduct = async (req, res) => {
  try {
    const body = req.body;

    const updateData = { ...body };

    if (body.specifications)
      updateData.specifications = JSON.parse(body.specifications);
    if (body.tags)
      updateData.tags = JSON.parse(body.tags);
    if (body.variations)
      updateData.variations = JSON.parse(body.variations);

    // If new images uploaded, append them
    if (req.files?.images) {
      const newImages = req.files.images.map((f) => ({
        url: f.path, public_id: f.filename,
      }));
      updateData.$push = { images: { $each: newImages } };
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!product)
      return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: product });
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
      { new: true }
    );

    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};