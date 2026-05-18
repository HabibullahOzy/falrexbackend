// require("dotenv").config();
// const express    = require("express");
// const http         = require("http");
// const { Server }   = require("socket.io");
// const cors       = require("cors");
// const cookieParser = require("cookie-parser");
// const connectDB  = require("./config/db");

// const initSocket   = require("./socket/chatSocket");

// // ── Routes ────────────────────────────────────────────────────────────────────
// const productRoutes = require("./routes/product.routes");
// const authRoutes    = require("./routes/auth.routes");
// const categoryRoutes = require("./routes/category.routes");
// const userRoutes     = require("./routes/user.routes");
// const cartRoutes  = require("./routes/cart.routes");
// const orderRoutes = require("./routes/order.routes");
// const reviewRoutes = require("./routes/review.routes");
// const chatRoutes     = require("./routes/chat.routes");



// connectDB();

// const app = express();
// const server = http.createServer(app);

// // ── Socket.IO ──────────────────────────────────────────────────────────────
// const io = new Server(server, {
//   cors: {
//     origin:      process.env.CLIENT_URL || "https://falrex.com" || 'https://www.falrex.com',
//     credentials: true,
//     methods:     ["GET", "POST"],
//   },
//   pingTimeout:  60000,
//   pingInterval: 25000,
// });

// initSocket(io);



// // Fix COOP for Google OAuth popup
// app.use((req, res, next) => {
//   res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
//   res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
//   next();
// });


// // ── Middleware ──────────────────────────────────────────────────
// app.use(cors({
//   origin: '*', // Your Next.js URL
//   credentials: true, 
//   methods: ["GET", "POST", "PUT", "DELETE"],
// }));

// // Add these lines right after app.use(cors(...))
// app.use(express.json({ limit: "50mb" }));
// app.use(express.urlencoded({ extended: true, limit: "50mb" }));
// app.use(cookieParser());   // parse auth_token cookie
// // app.use(express.json());
// // app.use(express.urlencoded({ extended: true }));

// // ──API Routes ──────────────────────────────────────────────────────
// app.use("/product", productRoutes);
// app.use("/auth",    authRoutes);
// app.use("/category", categoryRoutes);
// app.use("/users",    userRoutes);
// app.use("/cart",   cartRoutes);
// app.use("/orders", orderRoutes);
// app.use("/reviews", reviewRoutes);
// app.use("/chat",     chatRoutes);

// // Health check
// app.get("/", (req, res) => res.send("🟢 Server running"));


// // ── Global error handler ───────────────────────────────────────────────────────
// app.use((err, req, res, next) => {
//   console.error("🔥 Global error:", err);
//   res.status(500).json({ success: false, message: err.message });
// });

// // ── Start ───────────────────────────────────────────────────────
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));


require("dotenv").config();
const express      = require("express");
const http         = require("http");
const { Server }   = require("socket.io");
const cors         = require("cors");
const cookieParser = require("cookie-parser");
const connectDB    = require("./config/db");
const initSocket   = require("./socket/chatSocket");

// ── Routes ─────────────────────────────────────────────────────────────────
const productRoutes  = require("./routes/product.routes");
const authRoutes     = require("./routes/auth.routes");
const categoryRoutes = require("./routes/category.routes");
const userRoutes     = require("./routes/user.routes");
const cartRoutes     = require("./routes/cart.routes");
const orderRoutes    = require("./routes/order.routes");
const reviewRoutes   = require("./routes/review.routes");
const chatRoutes     = require("./routes/chat.routes");

connectDB();

const app    = express();
const server = http.createServer(app);

// ── Allowed origins ────────────────────────────────────────────────────────
// Add every origin that will send credentials (cookies).
// Never use "*" when credentials: true.
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://falrex.com",
  "https://www.falrex.com",
  // add staging / preview URLs here
];

const corsOptions = {
  origin: (origin, callback) => {
    // allow server-to-server (no origin) or known origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// ── Socket.IO ──────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin:      ALLOWED_ORIGINS,
    credentials: true,
    methods:     ["GET", "POST"],
  },
  pingTimeout:  60000,
  pingInterval: 25000,
});

initSocket(io);

// ── Fix COOP for Google OAuth popup ────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
  next();
});

// ── Core middleware ─────────────────────────────────────────────────────────
app.use(cors(corsOptions));
app.options("/(.*)", cors(corsOptions));   // handle pre-flight for all routes

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// ── API Routes ──────────────────────────────────────────────────────────────
app.use("/product",  productRoutes);
app.use("/auth",     authRoutes);
app.use("/category", categoryRoutes);
app.use("/users",    userRoutes);
app.use("/cart",     cartRoutes);
app.use("/orders",   orderRoutes);
app.use("/reviews",  reviewRoutes);
app.use("/chat",     chatRoutes);

// Health check
app.get("/", (req, res) => res.send("🟢 Server running"));

// ── Global error handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("🔥 Global error:", err);
  // Don't leak CORS error details in production
  if (err.message?.startsWith("CORS:")) {
    return res.status(403).json({ success: false, message: err.message });
  }
  res.status(500).json({ success: false, message: err.message });
});

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));
// Note: use server.listen (not app.listen) so Socket.IO works correctly