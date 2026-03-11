const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors()); // In production, configure this to your frontend domain
app.use(express.json({ limit: "10kb" })); // Prevent large payload attacks

// Routes
app.use("/api/specialists", require("./routes/specialists"));
app.use("/api/services", require("./routes/services"));
app.use("/api/reservations", require("./routes/reservations"));

// Centralized Error Handler (Prevents leaking DB details)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "An internal server error occurred." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
