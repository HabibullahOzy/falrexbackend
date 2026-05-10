const Category = require("../models/Category");
const cloudinary = require("../config/cloudinary");

// ── Helper: build slug ─────────────────────────────────────────────────────
function makeSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ── Helper: build subCategories from CATEGORY_TREE format ─────────────────
function buildSubCategories(subCatObj) {
  if (!subCatObj || typeof subCatObj !== "object") return [];
  return Object.entries(subCatObj).map(([subName, subSubItems]) => ({
    name: subName,
    slug: makeSlug(subName),
    subSubItems: (Array.isArray(subSubItems) ? subSubItems : []).map((s) => ({
      name: s,
      slug: makeSlug(s),
    })),
  }));
}

// ── CREATE ─────────────────────────────────────────────────────────────────
// POST /category
exports.createCategory = async (req, res) => {
  try {
    let { name, description, subCategories, order } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    // Check duplicate
    const exists = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
    if (exists) {
      return res.status(409).json({ success: false, message: "Category already exists" });
    }

    // Parse subCategories if sent as JSON string
    let parsedSubCats = [];
    if (subCategories) {
      try {
        const raw = typeof subCategories === "string"
          ? JSON.parse(subCategories) : subCategories;
        // Support both array format and object format (CATEGORY_TREE style)
        parsedSubCats = Array.isArray(raw)
          ? raw
          : buildSubCategories(raw);
      } catch { parsedSubCats = []; }
    }

    // Image
    const image = req.file
      ? { url: req.file.path, public_id: req.file.filename }
      : { url: "", public_id: "" };

    const category = await Category.create({
      name,
      slug:          makeSlug(name),
      description:   description || "",
      image,
      subCategories: parsedSubCats,
      order:         order ? Number(order) : 0,
    });

    return res.status(201).json({ success: true, data: category });
  } catch (err) {
    console.error("createCategory error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET ALL ────────────────────────────────────────────────────────────────
// GET /category
exports.getAllCategories = async (req, res) => {
  try {
    const { active, page = 1, limit = 50, search } = req.query;

    const filter = {};
    if (active === "true")  filter.isActive = true;
    if (active === "false") filter.isActive = false;
    if (search) filter.name = { $regex: new RegExp(search, "i") };

    const categories = await Category.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Category.countDocuments(filter);

    return res.json({ success: true, total, data: categories });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET ONE ────────────────────────────────────────────────────────────────
// GET /category/:id
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    return res.json({ success: true, data: category });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET BY SLUG ────────────────────────────────────────────────────────────
// GET /category/slug/:slug
exports.getCategoryBySlug = async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug });
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    return res.json({ success: true, data: category });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── UPDATE ─────────────────────────────────────────────────────────────────
// PUT /category/:id
exports.updateCategory = async (req, res) => {
  try {
    const { name, description, subCategories, order, isActive } = req.body;

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    // If new image uploaded, delete old from Cloudinary
    if (req.file && category.image?.public_id) {
      await cloudinary.uploader.destroy(category.image.public_id);
    }

    // Build update object
    const update = {};
    if (name)        { update.name = name; update.slug = makeSlug(name); }
    if (description !== undefined) update.description = description;
    if (order !== undefined)       update.order       = Number(order);
    if (isActive !== undefined)    update.isActive    = isActive === "true" || isActive === true;

    if (req.file) {
      update.image = { url: req.file.path, public_id: req.file.filename };
    }

    if (subCategories) {
      try {
        const raw = typeof subCategories === "string"
          ? JSON.parse(subCategories) : subCategories;
        update.subCategories = Array.isArray(raw)
          ? raw : buildSubCategories(raw);
      } catch {}
    }

    const updated = await Category.findByIdAndUpdate(
      req.params.id, update, { new: true, runValidators: true }
    );

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("updateCategory error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE ─────────────────────────────────────────────────────────────────
// DELETE /category/:id
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    // Delete image from Cloudinary
    if (category.image?.public_id) {
      await cloudinary.uploader.destroy(category.image.public_id);
    }

    await category.deleteOne();
    return res.json({ success: true, message: "Category deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── SEED from CATEGORY_TREE ────────────────────────────────────────────────
// POST /category/seed  (admin only — run once to populate DB)
exports.seedCategories = async (req, res) => {
  try {
    const { CATEGORY_TREE } = req.body;

    if (!CATEGORY_TREE || typeof CATEGORY_TREE !== "object") {
      return res.status(400).json({ success: false, message: "CATEGORY_TREE required in body" });
    }

    const results = [];
    for (const [catName, subCatObj] of Object.entries(CATEGORY_TREE)) {
      const exists = await Category.findOne({ name: catName });
      if (exists) { results.push({ name: catName, status: "skipped (exists)" }); continue; }

      const created = await Category.create({
        name:          catName,
        slug:          makeSlug(catName),
        subCategories: buildSubCategories(subCatObj),
      });
      results.push({ name: catName, status: "created", id: created._id });
    }

    return res.json({ success: true, results });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};