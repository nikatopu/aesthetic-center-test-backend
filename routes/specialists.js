const express = require("express");
const router = express.Router();
const db = require("../config/db");

// GET all specialists (with search)
router.get("/", async (req, res) => {
  const { search } = req.query;
  let query = "SELECT * FROM specialists";
  let params = [];

  if (search) {
    query += " WHERE name ILIKE $1 OR surname ILIKE $1";
    params.push(`%${search}%`);
  }

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new specialist
router.post("/", async (req, res) => {
  const { name, surname, photo_url } = req.body;

  // Validate required fields
  if (!name || !surname) {
    return res.status(400).json({ error: "Name and surname are required" });
  }

  // Validate names are not empty after trimming
  if (!name.trim() || !surname.trim()) {
    return res.status(400).json({ error: "Name and surname cannot be empty" });
  }

  try {
    const result = await db.query(
      "INSERT INTO specialists (name, surname, photo_url) VALUES ($1, $2, $3) RETURNING *",
      [name.trim(), surname.trim(), photo_url],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23514") {
      // CHECK constraint violation
      res.status(400).json({ error: "Name and surname cannot be empty" });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// PUT update specialist
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, surname, photo_url } = req.body;

  // Validate required fields
  if (!name || !surname) {
    return res.status(400).json({ error: "Name and surname are required" });
  }

  // Validate names are not empty after trimming
  if (!name.trim() || !surname.trim()) {
    return res.status(400).json({ error: "Name and surname cannot be empty" });
  }

  try {
    const result = await db.query(
      "UPDATE specialists SET name=$1, surname=$2, photo_url=$3 WHERE id=$4 RETURNING *",
      [name.trim(), surname.trim(), photo_url, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Specialist not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === "23514") {
      // CHECK constraint violation
      res.status(400).json({ error: "Name and surname cannot be empty" });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// DELETE specialist
router.delete("/:id", async (req, res) => {
  try {
    const result = await db.query(
      "DELETE FROM specialists WHERE id = $1 RETURNING id",
      [req.params.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Specialist not found" });
    }

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
