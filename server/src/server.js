require("dotenv").config();

const menuRouter = require("./routes/menu");
const ordersRouter = require("./routes/orders");
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const app = express();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

app.use(cors());
app.use(express.json());
app.use("/api/menu", menuRouter);
app.use("/api/orders", ordersRouter);

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      status: "ok",
      message: "Just Wok Up API and database are connected.",
      database: "connected",
    });
  } catch (error) {
    console.error("Database health check failed:", error.message);

    res.status(500).json({
      status: "error",
      message: "Database connection failed.",
    });
  }
});

const PORT = Number(process.env.PORT || 5000);

const server = app.listen(PORT, () => {
  console.log(`Just Wok Up API running at http://localhost:${PORT}`);
});

async function shutdown() {
  await pool.end();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
