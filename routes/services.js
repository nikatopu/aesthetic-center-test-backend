const express = require("express");
const router = express.Router();
const db = require("../config/db");

// 1. GET all services (Your existing code)
router.get("/", async (req, res) => {
  try {
    const services = await db.query("SELECT * FROM services ORDER BY id");

    // LEFT JOIN to include field values even if field definitions were deleted
    // This ensures services are always returned with their available field data
    const valuesQuery = `
      SELECT 
        sfv.*, 
        sfd.label as field_label,
        sfd.order_index
      FROM service_field_values sfv
      LEFT JOIN service_field_definitions sfd ON sfv.field_id = sfd.id
      ORDER BY sfv.service_id, COALESCE(sfd.order_index, 999)
    `;
    const values = await db.query(valuesQuery);

    const response = services.rows.map((service) => ({
      ...service,
      customFields: values.rows
        .filter((v) => v.service_id === service.id)
        .map((val) => ({
          ...val,
          field_label: val.field_label || `[Deleted Field ${val.field_id}]`,
        })),
    }));
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. POST create a new service (Handles Dynamic Fields)
router.post("/", async (req, res) => {
  const { name, price, color, customValues } = req.body;

  // Validate required fields
  if (!name || price === undefined || !color) {
    return res
      .status(400)
      .json({ error: "Name, price, and color are required" });
  }

  // Validate name is not empty
  if (!name.trim()) {
    return res.status(400).json({ error: "Name cannot be empty" });
  }

  // Validate price
  if (price < 0 || isNaN(price)) {
    return res
      .status(400)
      .json({ error: "Price must be a non-negative number" });
  }

  // Validate color format (hex)
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return res
      .status(400)
      .json({ error: "Color must be a valid hex code (e.g., #FF0000)" });
  }

  try {
    await db.query("BEGIN");

    // Insert main service
    const serviceRes = await db.query(
      "INSERT INTO services (name, price, color) VALUES ($1, $2, $3) RETURNING *",
      [name.trim(), price, color],
    );
    const serviceId = serviceRes.rows[0].id;

    // Insert custom field values (Page 8)
    if (customValues) {
      for (const [fieldId, value] of Object.entries(customValues)) {
        if (value) {
          await db.query(
            "INSERT INTO service_field_values (service_id, field_id, value) VALUES ($1, $2, $3)",
            [serviceId, fieldId, value],
          );
        }
      }
    }

    await db.query("COMMIT");
    res.status(201).json(serviceRes.rows[0]);
  } catch (err) {
    await db.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  }
});

// 3. PUT update existing service
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, price, color, customValues } = req.body;

  // Validate required fields
  if (!name || price === undefined || !color) {
    return res
      .status(400)
      .json({ error: "Name, price, and color are required" });
  }

  // Validate name is not empty
  if (!name.trim()) {
    return res.status(400).json({ error: "Name cannot be empty" });
  }

  // Validate price
  if (price < 0 || isNaN(price)) {
    return res
      .status(400)
      .json({ error: "Price must be a non-negative number" });
  }

  // Validate color format (hex)
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return res
      .status(400)
      .json({ error: "Color must be a valid hex code (e.g., #FF0000)" });
  }

  try {
    await db.query("BEGIN");

    // Update main service
    const updateResult = await db.query(
      "UPDATE services SET name=$1, price=$2, color=$3 WHERE id=$4 RETURNING *",
      [name.trim(), price, color, id],
    );

    if (updateResult.rows.length === 0) {
      await db.query("ROLLBACK");
      return res.status(404).json({ error: "Service not found" });
    }

    // Update custom field values: Delete old, Insert new
    await db.query("DELETE FROM service_field_values WHERE service_id = $1", [
      id,
    ]);

    if (customValues) {
      for (const [fieldId, value] of Object.entries(customValues)) {
        if (value) {
          await db.query(
            "INSERT INTO service_field_values (service_id, field_id, value) VALUES ($1, $2, $3)",
            [id, fieldId, value],
          );
        }
      }
    }

    await db.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await db.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  }
});

// 4. DELETE service
router.delete("/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM services WHERE id = $1", [req.params.id]);
    res.status(204).send();
  } catch (err) {
    if (err.code === "23503") {
      // Foreign key violation (RESTRICT)
      res.status(400).json({
        error:
          "Cannot delete service: it has associated reservations. Please remove all reservations first.",
      });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// --- Existing Field Routes ---

router.get("/fields", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM service_field_definitions ORDER BY order_index ASC",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/fields/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM service_field_definitions WHERE id = $1", [
      req.params.id,
    ]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/fields", async (req, res) => {
  const { label } = req.body;

  // Validate required field
  if (!label) {
    return res.status(400).json({ error: "Label is required" });
  }

  // Validate label is not empty
  if (!label.trim()) {
    return res.status(400).json({ error: "Label cannot be empty" });
  }

  try {
    const count = await db.query(
      "SELECT COUNT(*) FROM service_field_definitions",
    );
    const result = await db.query(
      "INSERT INTO service_field_definitions (label, order_index) VALUES ($1, $2) RETURNING *",
      [label.trim(), count.rows[0].count],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23514") {
      // CHECK constraint violation
      res.status(400).json({ error: "Label cannot be empty" });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

module.exports = router;
