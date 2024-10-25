import express from "express";
import cors from "cors";
import helmet from "helmet";
import xss from "xss-clean";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";
import ruleRoutes from "./routes/ruleRoutes.js";
import AppError from "../utils/AppError.js";

const app = express();

// Rate Limiting: Limits each IP to 150 requests per hour
const limiter = rateLimit({
  max: 150,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: "Too many requests from this IP, please try again in an hour!",
});
app.use("/api", limiter);

// Set Security Headers with Helmet
app.use(helmet());

// Prevent Cross-Site Scripting (XSS) Attacks
app.use(xss());

// Sanitize Data to Prevent NoSQL Injection
app.use(mongoSanitize());

// Prevent HTTP Parameter Pollution
app.use(
  hpp({
    whitelist: [],
  })
);

// Enable CORS with specific settings
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true,
  })
);

// Body Parser: Read JSON data from request body, limit 1MB
app.use(express.json({ limit: "1mb" }));

// Test Middleware: Add request timestamp
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// Route Handling
app.use("/api", ruleRoutes);

// Handle Unhandled Routes with AppError
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Export the Express App
export { app };
