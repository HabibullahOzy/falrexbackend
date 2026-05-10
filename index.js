require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const cookieParser = require("cookie-parser");
const connectDB  = require("./config/db");

// ── Routes ────────────────────────────────────────────────────────────────────
const productRoutes = require("./routes/product.routes");
const authRoutes    = require("./routes/auth.routes");
const categoryRoutes = require("./routes/category.routes");
const userRoutes     = require("./routes/user.routes");
const cartRoutes  = require("./routes/cart.routes");
const orderRoutes = require("./routes/order.routes");



connectDB();

const app = express();

// ── Middleware ──────────────────────────────────────────────────
app.use(cors({
  origin: "http://localhost:3000", // Your Next.js URL
  credentials: true, 
  methods: ["GET", "POST", "PUT", "DELETE"],
}));

// Add these lines right after app.use(cors(...))
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());   // parse auth_token cookie
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// ──API Routes ──────────────────────────────────────────────────────
app.use("/product", productRoutes);
app.use("/auth",    authRoutes);
app.use("/category", categoryRoutes);
app.use("/users",    userRoutes);
app.use("/cart",   cartRoutes);
app.use("/orders", orderRoutes);

// Health check
app.get("/", (req, res) => res.send("🟢 Server running"));


// ── Global error handler ───────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("🔥 Global error:", err);
  res.status(500).json({ success: false, message: err.message });
});

// ── Start ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));