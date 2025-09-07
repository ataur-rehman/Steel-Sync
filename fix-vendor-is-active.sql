-- Fix vendor is_active field inconsistency
-- Convert all boolean true/false values to integer 1/0

UPDATE vendors 
SET is_active = CASE 
  WHEN is_active = 'true' OR is_active = true THEN 1
  WHEN is_active = 'false' OR is_active = false THEN 0
  WHEN is_active = 1 THEN 1
  WHEN is_active = 0 THEN 0
  ELSE 1  -- Default to active if null or unexpected value
END;

-- Verify the fix
SELECT id, name, is_active, typeof(is_active) as type FROM vendors ORDER BY id;
