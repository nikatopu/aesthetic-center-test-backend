const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { checkOverlap } = require("../services/reservationService");
const { reservationValidator } = require("../middlewares/validators");

// --- 1. GET Reservations for a specific date (REQUIRED for Schedule Page) ---
router.get("/", async (req, res, next) => {
  const { date } = req.query; // e.g., 2026-03-11

  if (!date) {
    return res.status(400).json({ error: "Date parameter is required" });
  }

  try {
    // We join with services and use json_agg to get an array of services per reservation
    // LEFT JOINs ensure reservations are returned even if services are missing/deleted
    // This satisfies the requirement to show multiple services on a block (Page 3)
    const query = `
      SELECT 
        r.*, 
        spec.name as specialist_name,
        spec.surname as specialist_surname,
        COALESCE(
          json_agg(
            CASE 
              WHEN s.id IS NOT NULL THEN s 
              ELSE NULL 
            END
          ) FILTER (WHERE s.id IS NOT NULL), 
          '[]'::json
        ) as services
      FROM reservations r
      JOIN specialists spec ON r.specialist_id = spec.id
      LEFT JOIN reservation_services rs ON r.id = rs.reservation_id
      LEFT JOIN services s ON rs.service_id = s.id
      WHERE r.reservation_date = $1
      GROUP BY r.id, spec.id, spec.name, spec.surname
      ORDER BY r.start_time
    `;
    const result = await db.query(query, [date]);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// --- 2. POST Create Reservation (Your existing code) ---
router.post("/", reservationValidator, async (req, res, next) => {
  const {
    specialist_id,
    reservation_date,
    start_time,
    duration_minutes,
    service_ids,
  } = req.body;

  try {
    // Validate required fields
    if (
      !specialist_id ||
      !reservation_date ||
      !start_time ||
      !duration_minutes ||
      !service_ids
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Validate duration
    if (duration_minutes <= 0 || duration_minutes > 1440) {
      return res
        .status(400)
        .json({ error: "Duration must be between 1 and 1440 minutes" });
    }

    // Validate date is not in the past
    const reservationDate = new Date(reservation_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (reservationDate < today) {
      return res
        .status(400)
        .json({ error: "Cannot create reservations in the past" });
    }

    const specCheck = await db.query(
      "SELECT id FROM specialists WHERE id = $1",
      [specialist_id],
    );
    if (specCheck.rows.length === 0)
      return res.status(404).json({ error: "Specialist not found" });

    const servCheck = await db.query(
      "SELECT id FROM services WHERE id = ANY($1::int[])",
      [service_ids],
    );
    if (servCheck.rows.length !== service_ids.length) {
      return res
        .status(400)
        .json({ error: "One or more invalid services selected." });
    }

    const isOverlapping = await checkOverlap(
      specialist_id,
      reservation_date,
      start_time,
      duration_minutes,
    );
    if (isOverlapping)
      return res
        .status(400)
        .json({ error: "Specialist is already booked for this time slot." });

    await db.query("BEGIN");

    const resResult = await db.query(
      "INSERT INTO reservations (specialist_id, reservation_date, start_time, duration_minutes) VALUES ($1, $2, $3, $4) RETURNING *",
      [specialist_id, reservation_date, start_time, duration_minutes],
    );
    const reservationId = resResult.rows[0].id;

    for (let serviceId of service_ids) {
      await db.query(
        "INSERT INTO reservation_services (reservation_id, service_id) VALUES ($1, $2)",
        [reservationId, serviceId],
      );
    }

    await db.query("COMMIT");
    res.status(201).json(resResult.rows[0]);
  } catch (err) {
    await db.query("ROLLBACK");

    if (err.code === "23503") {
      // Foreign key violation
      res.status(400).json({ error: "Invalid specialist or service ID" });
    } else if (err.code === "23514") {
      // CHECK constraint violation
      res
        .status(400)
        .json({ error: "Invalid data: check duration and date constraints" });
    } else {
      next(err);
    }
  }
});

// --- 3. PUT Update Reservation (REQUIRED for Drag & Drop - Page 4) ---
router.put("/:id", async (req, res, next) => {
  const { id } = req.params;
  const { specialist_id, start_time, reservation_date, duration_minutes } =
    req.body;

  try {
    // Validate required fields
    if (
      !specialist_id ||
      !start_time ||
      !reservation_date ||
      !duration_minutes
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Validate duration is positive
    if (duration_minutes <= 0 || duration_minutes > 1440) {
      return res
        .status(400)
        .json({ error: "Duration must be between 1 and 1440 minutes" });
    }

    // Overlap check excluding the current reservation
    const isOverlapping = await checkOverlap(
      specialist_id,
      reservation_date,
      start_time,
      duration_minutes,
      id,
    );

    if (isOverlapping)
      return res
        .status(400)
        .json({ error: "Move not allowed: Overlap detected." });

    const result = await db.query(
      "UPDATE reservations SET specialist_id=$1, start_time=$2, reservation_date=$3, duration_minutes=$4 WHERE id=$5 RETURNING *",
      [specialist_id, start_time, reservation_date, duration_minutes, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// --- 4. DELETE Reservation (REQUIRED - Page 4) ---
router.delete("/:id", async (req, res, next) => {
  try {
    const result = await db.query(
      "DELETE FROM reservations WHERE id = $1 RETURNING id",
      [req.params.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
