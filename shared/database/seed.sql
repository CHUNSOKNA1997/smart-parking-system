-- Smart Parking System - Seed Data
-- Sample parking spots for testing

-- Insert 50 parking spots (5 levels x 10 spots each)
-- Level 1, Section A (Car spots)
INSERT INTO parking_spots (spot_id, level, section, spot_type, is_available, price_per_hour) VALUES
('A-01', 1, 'A', 'car', true, 2.00),
('A-02', 1, 'A', 'car', true, 2.00),
('A-03', 1, 'A', 'car', true, 2.00),
('A-04', 1, 'A', 'car', true, 2.00),
('A-05', 1, 'A', 'car', true, 2.00),
('A-06', 1, 'A', 'car', true, 2.00),
('A-07', 1, 'A', 'car', true, 2.00),
('A-08', 1, 'A', 'car', true, 2.00),
('A-09', 1, 'A', 'car', true, 2.00),
('A-10', 1, 'A', 'car', true, 2.00);

-- Level 2, Section B (Car spots)
INSERT INTO parking_spots (spot_id, level, section, spot_type, is_available, price_per_hour) VALUES
('B-01', 2, 'B', 'car', true, 2.00),
('B-02', 2, 'B', 'car', true, 2.00),
('B-03', 2, 'B', 'car', true, 2.00),
('B-04', 2, 'B', 'car', true, 2.00),
('B-05', 2, 'B', 'car', true, 2.00),
('B-06', 2, 'B', 'car', true, 2.00),
('B-07', 2, 'B', 'car', true, 2.00),
('B-08', 2, 'B', 'car', true, 2.00),
('B-09', 2, 'B', 'car', true, 2.00),
('B-10', 2, 'B', 'car', true, 2.00);

-- Level 3, Section C (Car spots)
INSERT INTO parking_spots (spot_id, level, section, spot_type, is_available, price_per_hour) VALUES
('C-01', 3, 'C', 'car', true, 2.50),
('C-02', 3, 'C', 'car', true, 2.50),
('C-03', 3, 'C', 'car', true, 2.50),
('C-04', 3, 'C', 'car', true, 2.50),
('C-05', 3, 'C', 'car', true, 2.50),
('C-06', 3, 'C', 'car', true, 2.50),
('C-07', 3, 'C', 'car', true, 2.50),
('C-08', 3, 'C', 'car', true, 2.50),
('C-09', 3, 'C', 'car', true, 2.50),
('C-10', 3, 'C', 'car', true, 2.50);

-- Level 4, Section D (Car spots)
INSERT INTO parking_spots (spot_id, level, section, spot_type, is_available, price_per_hour) VALUES
('D-01', 4, 'D', 'car', true, 2.50),
('D-02', 4, 'D', 'car', true, 2.50),
('D-03', 4, 'D', 'car', true, 2.50),
('D-04', 4, 'D', 'car', true, 2.50),
('D-05', 4, 'D', 'car', true, 2.50),
('D-06', 4, 'D', 'car', true, 2.50),
('D-07', 4, 'D', 'car', true, 2.50),
('D-08', 4, 'D', 'car', true, 2.50),
('D-09', 4, 'D', 'car', true, 2.50),
('D-10', 4, 'D', 'car', true, 2.50);

-- Level 1, Section M (Motorcycle spots)
INSERT INTO parking_spots (spot_id, level, section, spot_type, is_available, price_per_hour) VALUES
('M-01', 1, 'M', 'motorcycle', true, 1.00),
('M-02', 1, 'M', 'motorcycle', true, 1.00),
('M-03', 1, 'M', 'motorcycle', true, 1.00),
('M-04', 1, 'M', 'motorcycle', true, 1.00),
('M-05', 1, 'M', 'motorcycle', true, 1.00),
('M-06', 1, 'M', 'motorcycle', true, 1.00),
('M-07', 1, 'M', 'motorcycle', true, 1.00),
('M-08', 1, 'M', 'motorcycle', true, 1.00),
('M-09', 1, 'M', 'motorcycle', true, 1.00),
('M-10', 1, 'M', 'motorcycle', true, 1.00);

-- Mark some spots as occupied for testing
UPDATE parking_spots SET is_available = false WHERE spot_id IN ('A-01', 'A-05', 'B-03', 'C-07', 'M-02');

-- Display summary
SELECT 
    spot_type,
    COUNT(*) as total_spots,
    SUM(CASE WHEN is_available THEN 1 ELSE 0 END) as available,
    SUM(CASE WHEN NOT is_available THEN 1 ELSE 0 END) as occupied
FROM parking_spots
GROUP BY spot_type;
