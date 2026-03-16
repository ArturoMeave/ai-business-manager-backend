const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");

const app = express();

app.use(
  cors({
    origin: [
      "https://ai-business-manager-web.vercel.app", // Tu web oficial en Vercel
      "http://localhost:5173", // Tu ordenador para pruebas
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);
app.use(express.json({ limit: "10kb" }));
app.use(morgan("dev"));

app.use(helmet());

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5000,
  message:
    "Demasiadas peticiones desde esta IP, intenta de nuevo en 10 minutos.",
});
app.use("/api", limiter);

app.use((req, res, next) => {
  Object.defineProperty(req, "query", {
    value: { ...req.query },
    writable: true,
    configurable: true,
    enumerable: true,
  });
  next();
});

app.use(mongoSanitize());
app.use(xss());

app.get("/", (req, res) => {
  res.status(200).json({
    message: "API AI Business Manager v2.0",
    status: "Online",
    version: "2.0.0",
    timestamp: new Date(),
  });
});

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/clients", require("./routes/client.routes"));
app.use("/api/tasks", require("./routes/task.routes"));
app.use("/api/finance", require("./routes/finance.routes"));
app.use("/api/ai", require("./routes/ai.routes"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));

app.use((req, res) => {
  res.status(404).json({
    status: "fail",
    message: `No encuentro la ruta ${req.originalUrl} en este servidor`,
  });
});

const errorHandler = require("./middlewares/error.middleware");
app.use(errorHandler);

module.exports = app;
