const { body, query, validationResult } = require("express-validator");

// Helper to check for validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const reservationValidator = [
  body("specialist_id").isInt().withMessage("Invalid specialist ID"),
  body("reservation_date").isDate().withMessage("Invalid date format"),
  body("start_time")
    .matches(/^([01]\d|2[0-3]):?([0-5]\d)$/)
    .withMessage("Start time must be HH:mm"),
  body("duration_minutes")
    .isInt({ min: 15, max: 480 })
    .withMessage("Duration must be between 15 and 480 minutes"),
  body("service_ids")
    .isArray({ min: 1 })
    .withMessage("At least one service is required"),
  validate,
];

const specialistValidator = [
  body("name").trim().isLength({ min: 2, max: 50 }).escape(),
  body("surname").trim().isLength({ min: 2, max: 50 }).escape(),
  validate,
];

module.exports = { reservationValidator, specialistValidator };
