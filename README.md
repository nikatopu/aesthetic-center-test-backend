# Aesthetic Center Reservation System - Backend

> **Full-Stack Developer Test Project for Mitoni Systems LLC**

A comprehensive backend API for managing aesthetic center appointments, built with Node.js, Express.js, and PostgreSQL. This system provides robust reservation management, specialist scheduling, and service administration capabilities.

## 🔗 Related Repositories

**Frontend Repository:** [Aesthetic Center Frontend](https://github.com/nikatopu/aesthetic-center-test-frontend)

## 🏗️ Architecture Overview

### Technology Stack

- **Runtime:** Node.js
- **Framework:** Express.js 5.2.1
- **Database:** PostgreSQL with pg driver
- **Security:** Helmet.js, CORS, Express Validator
- **Development:** Nodemon for hot reloading

### Project Structure

```
backend/
├── config/
│   └── db.js                 # Database connection configuration
├── middlewares/
│   └── validators.js         # Input validation middleware
├── routes/
│   ├── reservations.js       # Reservation CRUD operations
│   ├── specialists.js        # Specialist management
│   └── services.js           # Service and custom fields management
├── services/
│   └── reservationService.js # Business logic for overlap checking
├── database/
│   └── schema.sql            # Complete database schema
├── index.js                  # Application entry point
└── package.json              # Dependencies and scripts
```

## 🗄️ Database Schema Design

### Core Entities

- **Specialists** - Healthcare professionals providing services
- **Services** - Available treatments with pricing and custom attributes
- **Reservations** - Customer appointments with time constraints
- **Service Field Definitions** - Dynamic custom fields for services
- **Service Field Values** - Values for custom attributes per service

### Key Design Decisions

#### 1. Referential Integrity

```sql
-- Cascading deletes preserve data hierarchy
specialists → reservations → reservation_services (CASCADE)

-- Restricted deletes protect business data
services ⇄ reservation_services (RESTRICT)
```

#### 2. Flexible Service Attributes

- **Dynamic custom fields** system allows adding service attributes without schema changes
- **Field definitions** are reusable across multiple services
- **Graceful degradation** when field definitions are deleted

#### 3. Time Overlap Prevention

- **Smart overlap detection** prevents double-booking specialists
- **Adjacent appointments** allowed (e.g., 09:00-10:00 → 10:00-11:00)
- **Update-safe** overlap checking excludes current reservation

#### 4. Data Validation Constraints

```sql
-- Business rule enforcements
CHECK (duration_minutes > 0 AND duration_minutes <= 1440)  -- Valid duration
CHECK (reservation_date >= CURRENT_DATE)                    -- No past bookings
CHECK (color ~ '^#[0-9A-Fa-f]{6}$')                        -- Valid hex colors
CHECK (length(trim(name)) > 0)                             -- Non-empty names
```

## 🔒 Security Implementation

### Application Security

- **Helmet.js** - Sets security-related HTTP headers
- **CORS** - Configured for cross-origin resource sharing
- **Payload Limiting** - JSON requests limited to 10KB to prevent DoS attacks
- **Input Validation** - Express-validator for request sanitization
- **Error Handling** - Centralized error handling prevents information leakage

### Database Security

- **Parameterized Queries** - All database queries use parameter binding to prevent SQL injection
- **Connection Pooling** - Efficient connection management via pg pool
- **Environment Variables** - Database credentials stored securely in `.env`

### Data Integrity

```javascript
// Transaction usage for data consistency
await db.query("BEGIN");
// Multiple related operations...
await db.query("COMMIT");
```

## 🚀 API Endpoints

### Reservations (`/api/reservations`)

- `GET /` - Fetch reservations by date with specialist and service details
- `POST /` - Create new reservation with overlap validation
- `PUT /:id` - Update reservation (drag & drop support)
- `DELETE /:id` - Cancel reservation

### Specialists (`/api/specialists`)

- `GET /` - List specialists with optional search filtering
- `POST /` - Add new specialist with validation
- `PUT /:id` - Update specialist information
- `DELETE /:id` - Remove specialist (cascades to reservations)

### Services (`/api/services`)

- `GET /` - List services with custom field values
- `POST /` - Create service with dynamic custom fields
- `PUT /:id` - Update service and custom field values
- `DELETE /:id` - Remove service (protected if has reservations)

### Service Fields (`/api/services/fields`)

- `GET /fields` - List custom field definitions
- `POST /fields` - Create new field definition
- `DELETE /fields/:id` - Remove field definition (cascades to values)

## 🏆 Key Features

### Advanced Overlap Detection

```javascript
// Prevents double-booking while allowing adjacent appointments
const isOverlapping = await checkOverlap(
  specialistId,
  date,
  startTime,
  duration,
  excludeId,
);
```

### Resilient Data Handling

- **Graceful degradation** - API returns reservations even if related services deleted
- **Left joins** prevent data loss when foreign references become stale
- **Audit timestamps** - Automatic created_at/updated_at tracking

### Smart Validation

- **Business rule validation** at database level
- **Input sanitization** at API level
- **Referential integrity** maintenance across all operations

## ⚙️ Environment Configuration

### Required Environment Variables

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_USER=your_username
DB_PASSWORD=your_password

# Server Configuration
PORT=5000
NODE_ENV=development
```

## 🛠️ Installation & Setup

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- Git

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Initialize database
psql -h localhost -p 5432 -U postgres -d your_database -f database/schema.sql

# Start development server
npm run dev

# Start production server
npm start
```

### Database Setup

```sql
-- Create database
CREATE DATABASE aesthetic_center;

-- Run schema
\c aesthetic_center
\i database/schema.sql
```

## 🧪 Business Logic Highlights

### Appointment Overlap Logic

- **Traditional overlap:** `(StartA < EndB) && (EndA > StartB)`
- **Enhancement:** Adjacent appointments explicitly allowed for chaining
- **Use case:** 08:00-09:00 appointment can be followed by 09:00-10:00

### Service Management

- **Dynamic fields** allow business flexibility without code changes
- **Historical preservation** - deleting field definitions keeps reservation data
- **Validation** ensures data consistency (pricing, colors, durations)

### Error Handling Strategy

- **User-friendly messages** for business rule violations
- **Technical logging** for debugging without information disclosure
- **Graceful degradation** for missing referenced data

## 📈 Performance Considerations

### Database Optimization

- **Strategic indexes** on foreign keys and common query patterns
- **Composite indexes** for specialist + date lookups
- **Query optimization** using joined aggregation for reservation details

### Application Optimization

- **Connection pooling** for database efficiency
- **Minimal data transfer** with selective field retrieval
- **Transaction boundaries** optimized for consistency vs. performance

## 🔄 Development Workflow

### Available Scripts

```bash
npm start          # Production server
npm run dev        # Development server with auto-reload
```

### Code Organization

- **Separation of concerns** - routes, services, configuration isolated
- **Middleware pattern** - validation and error handling as reusable middleware
- **Business logic encapsulation** - complex operations in service layer

---

**Project Status:** ✅ Complete MVP with production-ready features

**Development Contact:** Built as technical demonstration for Mitoni Systems LLC

**License:** ISC
