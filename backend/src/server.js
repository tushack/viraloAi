require("dotenv").config();

const {
  validateEnvironment,
} = require("./config/env.validation");

try {
  validateEnvironment();
  console.log("[Config] Environment validation passed.");
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const researchRoutes = require("./routes/research.routes");
const savedIdeasRoutes = require("./routes/savedIdeas.routes");
const dataPrivacyRoutes = require("./routes/dataPrivacy.routes");
const youtubeRoutes = require("./routes/youtube.routes");
const viralCheckRoutes = require("./routes/viralCheck.routes");
const trendsRoutes = require("./routes/trends.routes");
const mediaExportRoutes = require("./routes/mediaExport.routes");
const calendarRoutes = require("./routes/calendar.routes");
const adminRoutes = require("./routes/admin.routes");
const paymentRoutes = require("./routes/payment.routes");
const contactRoutes = require("./routes/contact.routes");


const {
  startMediaExportCleanupCron,
} = require("./jobs/mediaExportCleanupCron");

const {
  startDataPrivacyPurgeCron,
} = require("./jobs/dataPrivacyPurgeCron");

const {
  startCalendarReminderCron,
} = require("./jobs/calendarReminderCron");

const app = express();
app.disable("x-powered-by");

app.use(
  helmet({
    // Frontend aur backend different domains par ho sakte hain.
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

function normalizeOrigin(origin) {
  return String(origin || "").trim().replace(/\/$/, "");
}

const {
  razorpayWebhook,
} = require("./controllers/payment.controller");

function getAllowedOrigins() {
  const defaultOrigins = [
    "http://localhost:5173",
    "http://localhost:4173",
    "http://localhost:3000",
  ];

  const envOrigins = [
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGINS,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map(normalizeOrigin)
    .filter(Boolean);

  return [...new Set([...defaultOrigins, ...envOrigins])];
}

const allowedOrigins = getAllowedOrigins();
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 120, // Per IP maximum 120 API requests per minute
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    message: "Too many requests. Please try again after a minute.",
  },
});

app.use(
  cors({
    origin(origin, callback) {
      // Allow Postman, mobile apps, server-to-server calls, and curl.
      if (!origin) {
        return callback(null, true);
      }

      const cleanOrigin = normalizeOrigin(origin);

      if (allowedOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }

      console.error("CORS blocked origin:", cleanOrigin);
      console.error("Allowed origins:", allowedOrigins);

      return callback(new Error(`CORS blocked for origin: ${cleanOrigin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Disposition", "Content-Length"],
  })
);

app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

// app.post(
//   "/api/payments/razorpay/webhook",
//   express.raw({ type: "application/json" }),
//   razorpayWebhook
// );

// app.use(express.json());

app.post(
  "/api/payments/razorpay/webhook",
  express.raw({ type: "application/json" }),
  razorpayWebhook
);

// Razorpay webhook ke baad lagaya hai,
// taki payment callback global limiter se block na ho.
app.use("/api", apiLimiter);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "YouTube AI Research API is running",
  });
});

app.use("/api/research", researchRoutes);
app.use("/api/saved-ideas", savedIdeasRoutes);
app.use("/api/data-privacy", dataPrivacyRoutes);
app.use("/api/youtube", youtubeRoutes);
app.use("/api/viral-check", viralCheckRoutes);
app.use("/api/trends", trendsRoutes);
app.use("/api/media-exports", mediaExportRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/contact", contactRoutes);



const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  startDataPrivacyPurgeCron();
  startMediaExportCleanupCron();
  startCalendarReminderCron();
});