const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const Item = require("../controllers/stockController");

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ✅ Upload Excel and save items to DB
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const processedItems = [];

    for (const row of rawData) {
  const itemName = row["Material Description"] || "";
  const qrCode = row["Material"] || "";
  let quantityRaw = row["QTY"] || "";
  let quantity = parseFloat(quantityRaw);
  let unit = (row["Unit"] || "").toLowerCase().trim();

  if (!itemName || !qrCode || isNaN(quantity)) {
    console.warn("⚠️ Skipping invalid row:", row);
    continue;
  }

  if (unit === "g" || unit === "grams") {
    quantity = quantity / 1000;
    unit = "kg";
  }

  processedItems.push({
    itemName,
    qrCode,
    quantity,
    unit
  });
}

    if (processedItems.length === 0) {
      return res.status(400).send("No valid items found in Excel.");
    }

    await Item.deleteMany();
    await Item.insertMany(processedItems);

    res.status(200).send("✅ Items uploaded successfully with units.");
  } catch (err) {
    console.error("❌ Upload failed:", err);
    res.status(500).send("Upload failed");
  }
});

// ✅ Scan QR code to reduce quantity
router.post("/scan", async (req, res) => {
  const { qrCode, quantity = 1 } = req.body;

  try {
    const item = await Item.findOne({ qrCode });
    if (!item) return res.status(404).send("Item not found");

    const qty = parseInt(quantity);

    if (isNaN(qty) || qty <= 0) {
      return res.status(400).send("Invalid quantity requested");
    }

    if (item.quantity < qty) {
      return res.status(400).send(`Only ${item.quantity} ${item.unit} left in stock`);
    }

    item.quantity -= qty;
    await item.save();

    res.json({
      message: `✅ ${qty} ${item.unit} taken`,
      item
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error processing request");
  }
});


// ✅ Get stock list
router.get("/stock", async (req, res) => {
  const items = await Item.find();
  res.json(items);
});

module.exports = router;
