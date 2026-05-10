const User = require("../models/User");

// ── GET ALL USERS ──────────────────────────────────────────────────────────
// GET /users
exports.getAllUsers = async (req, res) => {
  try {
    const {
      role, sellerStatus, isActive,
      page = 1, limit = 20, search,
    } = req.query;

    const filter = {};
    if (role)         filter.role         = role;
    if (sellerStatus) filter.sellerStatus = sellerStatus;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (search) {
      filter.$or = [
        { firstName: { $regex: new RegExp(search, "i") } },
        { lastName:  { $regex: new RegExp(search, "i") } },
        { email:     { $regex: new RegExp(search, "i") } },
      ];
    }

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select("-__v");

    const total = await User.countDocuments(filter);

    // Stats
    const stats = await User.aggregate([
      { $group: {
        _id:      "$role",
        count:    { $sum: 1 },
      }},
    ]);

    return res.json({ success: true, total, data: users, stats });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET ONE USER ───────────────────────────────────────────────────────────
// GET /users/:uid
exports.getUserByUid = async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid }).select("-__v");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── UPDATE USER STATUS ─────────────────────────────────────────────────────
// PUT /users/:uid/status
exports.updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findOneAndUpdate(
      { uid: req.params.uid },
      { isActive },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({ success: true, data: user, message: `User ${isActive ? "activated" : "suspended"}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── UPDATE SELLER STATUS ───────────────────────────────────────────────────
// PUT /users/:uid/seller-status
exports.updateSellerStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const update = {
      sellerStatus:         status,
      isSellerVerified:     status === "approved",
      sellerRejectedReason: status === "rejected" ? (reason || "") : "",
    };

    const user = await User.findOneAndUpdate(
      { uid: req.params.uid }, update, { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({ success: true, data: user, message: `Seller ${status}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE USER ────────────────────────────────────────────────────────────
// DELETE /users/:uid
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ uid: req.params.uid });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({ success: true, message: "User deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};