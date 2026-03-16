const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");

const app = express();

// 1. El Chivato de la Terminal
app.use(morgan("dev"));

app.use((req, res, next) => {
  console.log("CORS Debug - Origin:", req.headers.origin);
  next();
});

// 2. El Portero de Seguridad (CORS) - ¡CORREGIDO!
app.use(
  cors({
    origin: [
      "https://ai-business-manager-web.vercel.app", // Tu comedor oficial en Vercel
      "http://localhost:5173", // Tu ordenador para pruebas locales
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
    credentials: true,
    optionsSuccessStatus: 204,
  }),
);

// 3. Los Escudos de Seguridad
app.use(helmet());
app.use(express.json({ limit: "10kb" }));

// 4. El Control de Multitudes
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5000,
  message:
    "Demasiadas peticiones desde esta IP, intenta de nuevo en 10 minutos.",
});
app.use("/api", limiter);

// 5. Los Limpiadores de Basura (Anti-Hackers)
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

// 6. La Puerta Principal (Comprobación de vida)
app.get("/", (req, res) => {
  res.status(200).json({
    message: "API AI Business Manager v2.0",
    status: "Online",
    version: "2.0.0",
    timestamp: new Date(),
  });
});

// 7. Los Pasillos hacia las Habitaciones (Rutas)
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/clients", require("./routes/client.routes"));
app.use("/api/tasks", require("./routes/task.routes"));
app.use("/api/finance", require("./routes/finance.routes"));
app.use("/api/ai", require("./routes/ai.routes"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));

// 8. La Pared sin Puerta (Error 404)
app.use((req, res) => {
  res.status(404).json({
    status: "fail",
    message: `No encuentro la ruta ${req.originalUrl} en este servidor`,
  });
});

// 9. El Médico de Urgencias (Manejador de Errores)
const errorHandler = require("./middlewares/error.middleware");
app.use(errorHandler);

module.exports = app;
