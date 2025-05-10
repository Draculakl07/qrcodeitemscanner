const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  itemName: String,
  qrCode: String,
  quantity: Number,
  unit: String // New field
});

const Item = mongoose.model("Item", itemSchema);

module.exports = Item;
