require("dotenv").config();
const express    = require("express");
const http         = require("http");
const { Server }   = require("socket.io");
const cors       = require("cors");
const cookieParser = require("cookie-parser");
const connectDB  = require("./config/db");

const initSocket   = require("./socket/chatSocket");

// ── Routes ────────────────────────────────────────────────────────────────────
const productRoutes = require("./routes/product.routes");
const authRoutes    = require("./routes/auth.routes");
const categoryRoutes = require("./routes/category.routes");
const userRoutes     = require("./routes/user.routes");
const cartRoutes  = require("./routes/cart.routes");
const orderRoutes = require("./routes/order.routes");
const reviewRoutes = require("./routes/review.routes");
const chatRoutes     = require("./routes/chat.routes");



connectDB();

const app = express();
const server = http.createServer(app);


// Fix COOP for Google OAuth popup
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});


// ── Middleware ──────────────────────────────────────────────────
// app.use(cors({
//   origin: '*', // Your Next.js URL
//   credentials: true, 
//   methods: ["GET", "POST", "PUT", "DELETE"],
// }));

// ── Allowed origins ────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://falrex.vercel.app",        // your production frontend
  "https://www.falrex.com",           // custom domain if any
  process.env.CLIENT_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`CORS blocked: ${origin}`);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials:         true,   // ← MUST be true for cookies
  methods:             ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders:      ["Content-Type", "Authorization", "x-session-id", "x-requested-with"],
  exposedHeaders:      ["Set-Cookie"],
  optionsSuccessStatus:200,    // some legacy browsers choke on 204
};

// ── Apply CORS before everything else ─────────────────────────────────────
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // handle preflight for all routes


// Add these lines right after app.use(cors(...))
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());   // parse auth_token cookie
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));


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


// ──API Routes ──────────────────────────────────────────────────────
app.use("/product", productRoutes);
app.use("/auth",    authRoutes);
app.use("/category", categoryRoutes);
app.use("/users",    userRoutes);
app.use("/cart",   cartRoutes);
app.use("/orders", orderRoutes);
app.use("/reviews", reviewRoutes);
app.use("/chat",     chatRoutes);

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