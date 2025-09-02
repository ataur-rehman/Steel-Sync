-- SQL Script to Insert 20 Quick Test Products
-- You can run this directly in your database if needed

INSERT INTO products (name, category, unit_type, rate_per_unit, current_stock, min_stock_alert, track_inventory, size, grade, created_at, updated_at) VALUES
('Steel Rod • 6mm • A-Grade', 'Steel Products', 'kg-grams', 245.50, '150kg', '15kg', 1, '6mm', 'A-Grade', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Steel Rod • 8mm • A-Grade', 'Steel Products', 'kg-grams', 265.75, '200kg', '20kg', 1, '8mm', 'A-Grade', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Steel Rod • 10mm • A-Grade', 'Steel Products', 'kg-grams', 285.00, '175kg', '18kg', 1, '10mm', 'A-Grade', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Steel Rod • 12mm • A-Grade', 'Steel Products', 'kg-grams', 310.25, '225kg', '25kg', 1, '12mm', 'A-Grade', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Steel Rod • 16mm • A-Grade', 'Steel Products', 'kg-grams', 340.50, '180kg', '20kg', 1, '16mm', 'A-Grade', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('Iron Bar • Small • Premium', 'Rods', 'piece-dozen', 125.00, '300', '30', 1, 'Small', 'Premium', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Iron Bar • Medium • Premium', 'Rods', 'piece-dozen', 185.50, '250', '25', 1, 'Medium', 'Premium', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Iron Bar • Large • Premium', 'Rods', 'piece-dozen', 245.75, '180', '20', 1, 'Large', 'Premium', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Iron Bar • XL • Premium', 'Rods', 'piece-dozen', 320.00, '120', '15', 1, 'XL', 'Premium', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('Copper Wire • 6mm', 'Wire', 'meter-cm', 75.25, '800m', '80m', 1, '6mm', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Copper Wire • 8mm', 'Wire', 'meter-cm', 85.50, '600m', '60m', 1, '8mm', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Copper Wire • 10mm', 'Wire', 'meter-cm', 95.75, '500m', '50m', 1, '10mm', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Copper Wire • 12mm', 'Wire', 'meter-cm', 110.00, '400m', '40m', 1, '12mm', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('Aluminum Sheet • Standard', 'Building Material', 'kg-grams', 180.25, '120kg', '15kg', 1, NULL, 'Standard', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Aluminum Sheet • Premium', 'Building Material', 'kg-grams', 220.50, '95kg', '12kg', 1, NULL, 'Premium', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Aluminum Sheet • Economy', 'Building Material', 'kg-grams', 150.75, '200kg', '25kg', 1, NULL, 'Economy', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('Brass Pipe • 1/2 inch', 'Other', 'piece-dozen', 320.00, '80', '10', 1, '1/2 inch', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Brass Pipe • 3/4 inch', 'Other', 'piece-dozen', 420.50, '65', '8', 1, '3/4 inch', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Brass Pipe • 1 inch', 'Other', 'piece-dozen', 520.75, '45', '6', 1, '1 inch', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Brass Pipe • 1.5 inch', 'Other', 'piece-dozen', 680.00, '25', '4', 1, '1.5 inch', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
