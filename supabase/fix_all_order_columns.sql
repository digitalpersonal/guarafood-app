-- Script to ensure all necessary columns for orders and table management exist
-- This addresses potential "missing SQL" errors when creating orders with table numbers or comanda numbers.

DO $$ 
BEGIN
    -- Add table_number if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'table_number') THEN
        ALTER TABLE orders ADD COLUMN table_number TEXT;
    END IF;

    -- Add comanda_number if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'comanda_number') THEN
        ALTER TABLE orders ADD COLUMN comanda_number TEXT;
    END IF;

    -- Add mensalista_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'mensalista_id') THEN
        ALTER TABLE orders ADD COLUMN mensalista_id UUID REFERENCES mensalistas(id);
    END IF;

    -- Add payment_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_status') THEN
        ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending';
    END IF;
    
    -- Ensure indexes for performance
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'orders' AND indexname = 'idx_orders_table_number') THEN
        CREATE INDEX idx_orders_table_number ON orders(table_number);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'orders' AND indexname = 'idx_orders_restaurant_id_status') THEN
        CREATE INDEX idx_orders_restaurant_id_status ON orders(restaurant_id, status);
    END IF;

END $$;
