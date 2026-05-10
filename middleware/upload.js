
const cloudinary = require("../config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// ── Single storage that handles both images & video ────────────────────────
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    if (file.fieldname === "video") {
      return {
        folder: "products/videos",
        resource_type: "video",
        allowed_formats: ["mp4", "mov", "avi", "webm", "mkv"],
      };
    }
    // Default → image
    return {
      folder: "products/images",
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
      transformation: [{ width: 1200, height: 1200, crop: "limit", quality: "auto" }],
    };
  },
});

// ── Single multer instance accepting BOTH fields ───────────────────────────
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max (covers video)
  },
}).fields([
  { name: "images", maxCount: 10 },
  { name: "video",  maxCount: 1  },
]);

// ── Middleware wrapper ─────────────────────────────────────────────────────
const uploadToCloudinary = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      console.error("❌ Upload error:", err);
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    // Map results for controller
    req.uploadedImages = (req.files?.images || []).map((f) => ({
      url:       f.path,
      public_id: f.filename,
    }));

    req.uploadedVideo = req.files?.video?.[0]
      ? {
          url:       req.files.video[0].path,
          public_id: req.files.video[0].filename,
        }
      : null;

    next();
  });
};

module.exports = uploadToCloudinary;