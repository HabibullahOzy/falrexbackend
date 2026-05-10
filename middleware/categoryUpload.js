const cloudinary = require("../config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:          "categories",
    resource_type:   "image",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "svg"],
    transformation:  [{ width: 400, height: 400, crop: "fill", quality: "auto" }],
  }),
});

const categoryUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).single("image");

const uploadCategoryImage = (req, res, next) => {
  categoryUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

module.exports = uploadCategoryImage;