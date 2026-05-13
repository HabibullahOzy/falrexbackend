const Category = require("../models/Category");
const cloudinary = require("../config/cloudinary");

function makeSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ── Full CATEGORY_TREE for auto-suggest ────────────────────────────────────
const CATEGORY_TREE = {
  "Consumer Electronics": {
    "TWS & Earphones": ["Gaming Earbuds", "ANC Earbuds", "Wired Earphones", "Open-Ear"],
    "Headphones": ["Over-Ear", "On-Ear", "Noise Cancelling", "Studio Monitor"],
    "Speakers": ["Portable Bluetooth", "Smart Speaker", "Soundbar", "Party Speaker"],
    "Smartwatch & Bands": ["Fitness Tracker", "Smart Band", "Luxury Smartwatch", "Kids Watch"],
    "Mobile Accessories": ["Power Bank", "Charger & Cables", "Phone Case", "Screen Protector"],
    "PC Peripherals": ["Mechanical Keyboard", "Gaming Mouse", "Webcam", "USB Hub"],
    "LED & Lighting": ["LED Strip", "Smart Bulb", "Desk Lamp", "RGB Light"],
  },
  "Fashion & Apparel": {
    "Men's Clothing": ["T-Shirt", "Polo Shirt", "Hoodie", "Jacket", "Trousers"],
    "Women's Clothing": ["Dress", "Blouse", "Skirt", "Abaya", "Leggings"],
    "Streetwear": ["Oversized Tee", "Cargo Pants", "Bomber Jacket", "Cap"],
    "Footwear": ["Sneakers", "Sandals", "Formal Shoes", "Boots"],
    "Bags & Luggage": ["Backpack", "Tote Bag", "Crossbody", "Luggage Set"],
    "Headwear": ["Baseball Cap", "Bucket Hat", "Beanie", "Hijab"],
  },
  "Beauty & Personal Care": {
    "Skincare": ["Moisturizer", "Serum", "Sunscreen", "Face Wash", "Toner"],
    "Haircare": ["Shampoo", "Conditioner", "Hair Oil", "Hair Mask"],
    "Makeup": ["Foundation", "Lipstick", "Mascara", "Eyeshadow"],
    "Fragrances": ["Perfume", "Body Mist", "Attar", "Deodorant"],
    "Personal Hygiene": ["Soap", "Hand Sanitizer", "Toothbrush", "Razor"],
  },
  "Jewellery & Accessories": {
    "Gold Jewellery": ["Gold Necklace", "Gold Ring", "Gold Crown", "Gold Bracelet", "Gold Earring", "Gold Bangle"],
    "Silver Jewellery": ["Silver Necklace", "Silver Ring", "Silver Bracelet", "Silver Earring"],
    "Artificial Jewellery": ["Fashion Necklace", "Fashion Ring", "Fashion Earring", "Fashion Bangle"],
    "Diamond Jewellery": ["Diamond Ring", "Diamond Necklace", "Diamond Earring", "Diamond Pendant"],
    "Gemstone Jewellery": ["Ruby", "Sapphire", "Emerald", "Pearl", "Opal"],
    "Watches": ["Luxury Watch", "Sports Watch", "Couple Watch", "Pocket Watch"],
  },
  "Home & Kitchen": {
    "Cookware": ["Non-Stick Pan", "Pressure Cooker", "Wok", "Pot Set"],
    "Kitchen Appliances": ["Blender", "Rice Cooker", "Air Fryer", "Microwave"],
    "Furniture": ["Sofa", "Office Chair", "Dining Table", "Bookshelf"],
    "Bedding": ["Pillow", "Blanket", "Mattress", "Bed Sheet"],
    "Home Decor": ["Wall Art", "Vase", "Mirror", "Curtains"],
  },
  "Sports & Outdoors": {
    "Fitness Equipment": ["Dumbbell", "Resistance Band", "Yoga Mat", "Treadmill"],
    "Sportswear": ["Jersey", "Track Suit", "Compression Wear", "Sports Shoes"],
    "Outdoor Gear": ["Tent", "Sleeping Bag", "Hiking Boots", "Backpack"],
    "Team Sports": ["Football", "Cricket Gear", "Basketball", "Badminton"],
  },
  "Industrial & Machinery": {
    "Power Tools": ["Drill", "Angle Grinder", "Circular Saw", "Welding Machine"],
    "Safety Equipment": ["Helmet", "Safety Gloves", "Reflective Vest", "Safety Boots"],
    "Packaging Machinery": ["Sealing Machine", "Labelling Machine", "Filling Machine"],
    "Electrical": ["Cable & Wire", "Switch & Socket", "Circuit Breaker", "Generator"],
  },
  "Health & Medical": {
    "Medical Devices": ["Blood Pressure Monitor", "Glucometer", "Pulse Oximeter", "Thermometer"],
    "Supplements": ["Protein Powder", "Vitamins", "Fish Oil", "Probiotic"],
    "PPE": ["Surgical Mask", "N95 Mask", "Gloves", "Gown"],
    "Wellness": ["Essential Oil", "Massage Device", "Heating Pad", "Eye Mask"],
  },
  "Toys & Hobbies": {
    "Kids Toys": ["Action Figure", "Doll", "Building Block", "RC Car"],
    "Board Games": ["Chess", "Puzzle", "Card Game", "Strategy Game"],
    "Art & Craft": ["Color Pencil", "Canvas", "Clay", "Painting Kit"],
    "Collectibles": ["Funko Pop", "Die-cast Model", "Trading Card", "Figurine"],
  },
  "Automotive": {
    "Car Accessories": ["Car Charger", "Dash Cam", "Car Perfume", "Seat Cover"],
    "Motorcycle Parts": ["Helmet", "Gloves", "Chain Lube", "Mirror"],
    "Car Care": ["Wax & Polish", "Microfiber Cloth", "Tyre Inflator", "Car Vacuum"],
    "Navigation": ["GPS Tracker", "HUD Display", "Backup Camera", "Car Mount"],
  },
  "Food & Beverage": {
    "Snacks": ["Chips", "Biscuits", "Nuts & Dried Fruits", "Energy Bar"],
    "Beverages": ["Juice", "Energy Drink", "Tea & Coffee", "Mineral Water"],
    "Organic & Natural": ["Organic Honey", "Cold Pressed Oil", "Herbal Tea", "Spices"],
    "Dairy & Eggs": ["Milk Powder", "Cheese", "Butter", "Yogurt"],
  },
};

// ── GET CATEGORY TREE (for auto-suggest) ──────────────────────────────────
// GET /category/tree
exports.getCategoryTree = (req, res) => {
  return res.json({ success: true, data: CATEGORY_TREE });
};

// ── CREATE CATEGORY ────────────────────────────────────────────────────────
// POST /category
exports.createCategory = async (req, res) => {
  try {
    const { name, description, subCategories, order } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Category name required" });
    }

    // Auto-approve if admin/super_admin
    const role = req.user?.role || "seller";
    const status = ["admin", "super_admin"].includes(role) ? "approved" : "pending";

    // Build slug — ensure uniqueness
    let slug = makeSlug(name);
    const dup = await Category.findOne({ slug });
    if (dup) slug = `${slug}-${Date.now()}`;

    // Parse subCategories
    let parsedSubCats = [];
    if (subCategories) {
      try {
        const raw = typeof subCategories === "string"
          ? JSON.parse(subCategories) : subCategories;
        parsedSubCats = buildSubCategories(raw);
      } catch { parsedSubCats = []; }
    }

    // Image
    const image = req.file
      ? { url: req.file.path, public_id: req.file.filename }
      : { url: "", public_id: "" };

    const category = await Category.create({
      name: name.trim(),
      slug,
      description: description || "",
      image,
      subCategories: parsedSubCats,
      order: order ? Number(order) : 0,
      status,
      createdBy: {
        uid: req.user?.uid || "",
        name: req.user?.firstName ? `${req.user.firstName} ${req.user.lastName || ""}`.trim() : "",
        role,
        email: req.user?.email || "",
      },
      // Auto-fill approver if admin
      ...(status === "approved" && {
        approvedBy: { uid: req.user?.uid || "", name: req.user?.firstName || "" },
        approvedAt: new Date(),
      }),
    });

    return res.status(201).json({
      success: true,
      data: category,
      message: status === "approved"
        ? "Category created and approved"
        : "Category submitted for admin approval",
    });
  } catch (err) {
    console.error("createCategory error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET ALL CATEGORIES ─────────────────────────────────────────────────────
// GET /category
exports.getAllCategories = async (req, res) => {
  try {
    const {
      status, active, page = 1,
      limit = 50, search,
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    else filter.status = "approved"; // default: only approved
    if (active === "true") filter.isActive = true;
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

// ── GET ALL FOR ADMIN (all statuses) ──────────────────────────────────────
// GET /category/admin/all
exports.getAdminAllCategories = async (req, res) => {
  try {
    const { status, page = 1, limit = 30, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.name = { $regex: new RegExp(search, "i") };

    const categories = await Category.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .populate("subCategories")
      .limit(Number(limit));

    const total = await Category.countDocuments(filter);
    const pending = await Category.countDocuments({ status: "pending" });
    const approved = await Category.countDocuments({ status: "approved" });
    const rejected = await Category.countDocuments({ status: "rejected" });

    return res.json({ success: true, total, pending, approved, rejected, data: categories });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET ONE ────────────────────────────────────────────────────────────────
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, data: category });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


// // ── GET CATEGORIES FOR LANDING PAGE ───────────────────────────────────────
// // GET /category/landing
exports.getLandingCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      status: "approved",
      isActive: true,
    })
    console.log(categories)
      .sort({ order: 1, createdAt: -1 })
      .select("name slug image subCategories order")
      .limit(50);

    return res.json({ success: true, total: categories.length, data: categories });
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
    if (!category) return res.status(404).json({ success: false, message: "Not found" });

    // Sellers can only edit their own pending categories
    const role = req.user?.role;
    if (role === "seller") {
      if (category.createdBy.uid !== req.user.uid) {
        return res.status(403).json({ success: false, message: "Not authorized" });
      }
      if (category.status === "approved") {
        return res.status(403).json({
          success: false,
          message: "Cannot edit an approved category. Contact admin.",
        });
      }
    }

    // Delete old image if new one uploaded
    if (req.file && category.image?.public_id) {
      await cloudinary.uploader.destroy(category.image.public_id);
    }

    const update = {};
    if (name) { update.name = name.trim(); update.slug = makeSlug(name); }
    if (description !== undefined) update.description = description;
    if (order !== undefined) update.order = Number(order);
    if (isActive !== undefined) update.isActive = isActive === "true" || isActive === true;
    if (req.file) update.image = { url: req.file.path, public_id: req.file.filename };

    if (subCategories) {
      try {
        const raw = typeof subCategories === "string"
          ? JSON.parse(subCategories) : subCategories;
        update.subCategories = buildSubCategories(raw);
      } catch { }
    }

    // If seller edits, reset to pending
    if (role === "seller") {
      update.status = "pending";
    }

    const updated = await Category.findByIdAndUpdate(
      req.params.id, update, { new: true }
    );
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── APPROVE / REJECT ───────────────────────────────────────────────────────
// PUT /category/:id/approve
exports.approveCategory = async (req, res) => {
  try {
    const { action, reason } = req.body; // action: "approve" | "reject"

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid action" });
    }

    const update = {
      status: action === "approve" ? "approved" : "rejected",
      rejectedReason: action === "reject" ? (reason || "") : "",
      approvedBy: {
        uid: req.user?.uid || "",
        name: req.user?.firstName ? `${req.user.firstName} ${req.user.lastName || ""}`.trim() : "",
      },
      approvedAt: action === "approve" ? new Date() : null,
    };

    const category = await Category.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!category) return res.status(404).json({ success: false, message: "Not found" });

    return res.json({
      success: true,
      data: category,
      message: `Category ${action === "approve" ? "approved" : "rejected"}`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE ─────────────────────────────────────────────────────────────────
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Not found" });

    // Sellers can only delete their own pending
    const role = req.user?.role;
    if (role === "seller") {
      if (category.createdBy.uid !== req.user.uid || category.status === "approved") {
        return res.status(403).json({ success: false, message: "Not authorized" });
      }
    }

    if (category.image?.public_id) {
      await cloudinary.uploader.destroy(category.image.public_id);
    }
    await category.deleteOne();
    return res.json({ success: true, message: "Category deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── HELPER: build subCategories from object or array ──────────────────────
function buildSubCategories(raw) {
  if (Array.isArray(raw)) return raw.map((sub) => ({
    name: sub.name,
    slug: makeSlug(sub.name),
    isActive: sub.isActive ?? true,
    subSubItems: (sub.subSubItems || sub.items || []).map((s) => ({
      name: typeof s === "string" ? s : s.name,
      slug: makeSlug(typeof s === "string" ? s : s.name),
      isActive: true,
    })),
  }));

  // Object format: { "SubCat": ["item1", "item2"] }
  return Object.entries(raw).map(([subName, items]) => ({
    name: subName,
    slug: makeSlug(subName),
    isActive: true,
    subSubItems: (Array.isArray(items) ? items : []).map((s) => ({
      name: s, slug: makeSlug(s), isActive: true,
    })),
  }));
}