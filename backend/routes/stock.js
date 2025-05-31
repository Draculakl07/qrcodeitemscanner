const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const Item = require("../controllers/stockController");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ✅ Upload Excel: Overwrite or Add
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    for (const row of rows) {
      const qrCode = row["Material"];
      const itemName = row["Material Description"];
      let quantity = parseFloat(row["QTY"]);
      let unit = (row["Unit"] || "").toLowerCase().trim();

      if (!itemName || !qrCode || isNaN(quantity)) continue;

      if (unit === "g" || unit === "grams") {
        quantity = quantity / 1000;
        unit = "kg";
      }

      await Item.findOneAndUpdate(
        { qrCode },
        { itemName, qrCode, quantity, unit },
        { upsert: true, new: true }
      );
    }

    res.status(200).send("✅ Upload successful. Existing entries updated, new added.");
  } catch (err) {
    console.error("❌ Upload failed:", err);
    res.status(500).send("Upload failed.");
  }
});

// ✅ Download Template from uploads folder
router.get("/template", (req, res) => {
  const filePath = path.join(__dirname, "../uploads/template.xlsx");

  if (fs.existsSync(filePath)) {
    res.download(filePath, "Template.xlsx");
  } else {
    res.status(404).send("Template file not found in uploads folder.");
  }
});

// ✅ Download Current Stock
router.get("/download", async (req, res) => {
  try {
    const items = await Item.find();
    const worksheet = XLSX.utils.json_to_sheet(items.map(item => ({
      Material: item.qrCode,
      "Material Description": item.itemName,
      QTY: item.quantity,
      Unit: item.unit.toUpperCase()
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock");

    const filePath = path.join(__dirname, "../current_stock.xlsx");
    XLSX.writeFile(workbook, filePath);

    res.download(filePath, "Current_Stock.xlsx", err => {
      if (!err) fs.unlinkSync(filePath);
    });
  } catch (err) {
    console.error("❌ Download failed:", err);
    res.status(500).send("Failed to download stock.");
  }
});

// ✅ Scan to Reduce
router.post("/scan", async (req, res) => {
  const { qrCode, quantity = 1 } = req.body;

  try {
    const item = await Item.findOne({ qrCode });
    if (!item) return res.status(404).send("Item not found");

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return res.status(400).send("Invalid quantity");
    if (item.quantity < qty) return res.status(400).send(`Only ${item.quantity} ${item.unit} left`);

    item.quantity -= qty;
    await item.save();

    res.json({ message: `✅ ${qty} ${item.unit} taken`, item });
  } catch (err) {
    console.error("❌ Scan error:", err);
    res.status(500).send("Scan failed");
  }
});

// ✅ Get All Stock
router.get("/stock", async (req, res) => {
  const items = await Item.find();
  res.json(items);
});

// ✅ Edit Stock Quantity
router.post("/edit", async (req, res) => {
  const { qrCode, quantity } = req.body;

  try {
    const item = await Item.findOne({ qrCode });
    if (!item) return res.status(404).send("Item not found");

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty < 0) return res.status(400).send("Invalid quantity");

    item.quantity = qty;
    await item.save();

    res.json({ message: "✅ Quantity updated", item });
  } catch (err) {
    console.error("❌ Update error:", err);
    res.status(500).send("Failed to update");
  }
});

// ✅ Delete Stock Item
router.delete("/delete/:qrCode", async (req, res) => {
  try {
    const { qrCode } = req.params;
    const result = await Item.deleteOne({ qrCode });

    if (result.deletedCount === 0) {
      return res.status(404).send("Item not found");
    }

    res.send("✅ Item deleted");
  } catch (err) {
    console.error("❌ Delete error:", err);
    res.status(500).send("Failed to delete item");
  }
});

// ✅ Save Logs
router.post("/log", (req, res) => {
  const { action, timestamp } = req.body;
  const logLine = `[${timestamp}] ${action}\n`;
  fs.appendFileSync("log.txt", logLine);
  res.sendStatus(200);
});

// ✅ View Logs
router.get("/log", (req, res) => {
  try {
    const data = fs.readFileSync("log.txt", "utf8");
    res.type("text/plain").send(data);
  } catch (err) {
    res.status(500).send("Log file not found.");
  }
});

module.exports = router;
