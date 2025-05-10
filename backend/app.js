// backend/app.js
const express = require("express");
const connectDB = require("./config");
const stockRoutes = require("./routes/stock");
const cors = require("cors");
require("dotenv").config();

console.log("MONGO_URI from .env:", process.env.MONGO_URI);

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors());
app.use(express.json());
app.use("/api", stockRoutes);

app.listen(PORT, "0.0.0.0", () => {
  console.log("MongoDB connected!");
  console.log(`Server is running on port ${PORT}`);
});
