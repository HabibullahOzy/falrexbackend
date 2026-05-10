const admin = require("../config/firebaseAdmin");

// Verify Firebase ID token from Authorization header or body
const verifyFirebase = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split("Bearer ")[1]
      : req.body?.firebaseToken;

    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const decoded = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid Firebase token" });
  }
};

module.exports = verifyFirebase;