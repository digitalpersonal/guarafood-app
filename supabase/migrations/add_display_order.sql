-- Migration to add display_order to menu_categories and menu_items
-- This allows users to custom sort their menu

ALTER TABLE menu_categories 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Optional: Initialize display_order with ID to maintain some order if it was null
UPDATE menu_categories SET display_order = id WHERE display_order IS NULL OR display_order = 0;
UPDATE menu_items SET display_order = id WHERE display_order IS NULL OR display_order = 0;
