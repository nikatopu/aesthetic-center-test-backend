-- 1. Specialists (Page 5)
CREATE TABLE IF NOT EXISTS specialists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL CHECK (length(trim(name)) > 0),
    surname VARCHAR(100) NOT NULL CHECK (length(trim(surname)) > 0),
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Services (Page 7/8)
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL CHECK (length(trim(name)) > 0),
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    color VARCHAR(7) NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'), -- Hex color validation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Custom Field Definitions for Services (Page 7/8)
CREATE TABLE IF NOT EXISTS service_field_definitions (
    id SERIAL PRIMARY KEY,
    label VARCHAR(100) NOT NULL CHECK (length(trim(label)) > 0),
    order_index INTEGER NOT NULL DEFAULT 0 CHECK (order_index >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Values for Custom Fields per Service (Page 8)
CREATE TABLE IF NOT EXISTS service_field_values (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE ON UPDATE CASCADE,
    field_id INTEGER NOT NULL REFERENCES service_field_definitions(id) ON DELETE CASCADE ON UPDATE CASCADE,
    value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(service_id, field_id)
);

-- 5. Reservations (Page 2, 4, 9)
CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    specialist_id INTEGER NOT NULL REFERENCES specialists(id) ON DELETE CASCADE ON UPDATE CASCADE,
    reservation_date DATE NOT NULL CHECK (reservation_date >= CURRENT_DATE),
    start_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 1440), -- Max 24 hours
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Reservation-Services Junction (Page 3/9: "one or multiple services")
CREATE TABLE IF NOT EXISTS reservation_services (
    reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE ON UPDATE CASCADE,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (reservation_id, service_id)
);

-- Indexes for foreign key performance and integrity
CREATE INDEX IF NOT EXISTS idx_service_field_values_service_id ON service_field_values(service_id);
CREATE INDEX IF NOT EXISTS idx_service_field_values_field_id ON service_field_values(field_id);
CREATE INDEX IF NOT EXISTS idx_reservations_specialist_id ON reservations(specialist_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_specialist_date ON reservations(specialist_id, reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservation_services_reservation_id ON reservation_services(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_services_service_id ON reservation_services(service_id);

-- Update timestamp triggers for audit trail
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_specialists_updated_at BEFORE UPDATE ON specialists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_field_definitions_updated_at BEFORE UPDATE ON service_field_definitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_field_values_updated_at BEFORE UPDATE ON service_field_values
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();