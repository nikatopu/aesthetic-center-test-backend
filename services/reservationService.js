const db = require("../config/db");

const checkOverlap = async (
  specialistId,
  date,
  startTime,
  durationMinutes,
  excludeReservationId = null,
) => {
  if (!Number.isInteger(specialistId) || specialistId <= 0) {
    throw new Error("Invalid specialist ID");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid date format");
  }

  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(startTime)) {
    throw new Error("Invalid start time format");
  }

  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new Error("Invalid duration");
  }

  const normalizedStart =
    startTime.split(":").length === 2 ? `${startTime}:00` : startTime;

  const query = `
    SELECT EXISTS (
      SELECT 1
      FROM reservations
      WHERE specialist_id = $1
        AND reservation_date = $2
        ${excludeReservationId ? "AND id <> $5" : ""}
        AND tsrange(
              reservation_date + start_time,
              reservation_date + start_time + (duration_minutes * INTERVAL '1 minute')
            )
        &&
        tsrange(
              $2::date + $3::time,
              $2::date + $3::time + ($4 * INTERVAL '1 minute')
            )
    ) AS overlap
  `;

  const params = [specialistId, date, normalizedStart, durationMinutes];
  if (excludeReservationId) params.push(excludeReservationId);

  const result = await db.query(query, params);

  return result.rows[0].overlap;
};

module.exports = { checkOverlap };
