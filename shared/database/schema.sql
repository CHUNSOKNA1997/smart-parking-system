-- Smart Parking System Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE (Auth Service)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    is_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);

-- ============================================
-- PARKING SPOTS TABLE (Parking Service)
-- ============================================
CREATE TABLE IF NOT EXISTS parking_spots (
    spot_id VARCHAR(10) PRIMARY KEY,
    level INT NOT NULL,
    section VARCHAR(10) NOT NULL,
    spot_type VARCHAR(20) CHECK (spot_type IN ('car', 'motorcycle')) NOT NULL,
    is_available BOOLEAN DEFAULT true,
    price_per_hour DECIMAL(10,2) DEFAULT 2.00,
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parking_available ON parking_spots(is_available);
CREATE INDEX IF NOT EXISTS idx_parking_type ON parking_spots(spot_type);

-- ============================================
-- BOOKINGS TABLE (Parking Service)
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
    booking_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    spot_id VARCHAR(10) NOT NULL REFERENCES parking_spots(spot_id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP,
    duration_hours DECIMAL(4,2),
    total_price DECIMAL(10,2),
    status VARCHAR(20) CHECK (status IN ('reserved', 'active', 'completed', 'cancelled')) DEFAULT 'reserved',
    qr_code TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_spot ON bookings(spot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(start_time, end_time);

-- ============================================
-- TRANSACTIONS TABLE (Parking Service)
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(booking_id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash',
    status VARCHAR(20) CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'completed',
    description TEXT,
    transaction_date TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_booking ON transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);

-- ============================================
-- FUNCTION: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS: Auto-update timestamps
-- ============================================
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS: Useful queries
-- ============================================

-- Active bookings with user and spot details
CREATE OR REPLACE VIEW active_bookings AS
SELECT 
    b.booking_id,
    b.user_id,
    u.first_name,
    u.last_name,
    u.email,
    b.spot_id,
    ps.level,
    ps.section,
    ps.spot_type,
    b.start_time,
    b.end_time,
    b.duration_hours,
    b.total_price,
    b.status,
    b.qr_code
FROM bookings b
JOIN users u ON b.user_id = u.user_id
JOIN parking_spots ps ON b.spot_id = ps.spot_id
WHERE b.status IN ('reserved', 'active');

-- Available parking spots
CREATE OR REPLACE VIEW available_spots AS
SELECT * FROM parking_spots
WHERE is_available = true
ORDER BY level, section, spot_id;

-- User booking history with transaction details
CREATE OR REPLACE VIEW user_booking_history AS
SELECT 
    b.booking_id,
    b.user_id,
    u.email,
    b.spot_id,
    ps.level,
    ps.section,
    b.start_time,
    b.end_time,
    b.duration_hours,
    b.total_price,
    b.status,
    t.transaction_id,
    t.payment_method,
    t.transaction_date
FROM bookings b
JOIN users u ON b.user_id = u.user_id
JOIN parking_spots ps ON b.spot_id = ps.spot_id
LEFT JOIN transactions t ON b.booking_id = t.booking_id
ORDER BY b.created_at DESC;
