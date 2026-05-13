-- Migration to add advertisements table
CREATE TABLE IF NOT EXISTS ads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    image_url TEXT NOT NULL,
    link_url TEXT,
    alt_text TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active ads
CREATE POLICY "Allow public read access to active ads" ON ads
    FOR SELECT USING (is_active = true);

-- Allow authenticated admins to manage all ads
CREATE POLICY "Allow authenticated admins to manage all ads" ON ads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Seed some initial ads
INSERT INTO ads (image_url, alt_text, link_url) VALUES 
('https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop', 'Aproveite nossas ofertas!', '#'),
('https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format&fit=crop', 'Churrasco de qualidade', '#'),
('https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1200&auto=format&fit=crop', 'Pizzas artesanais', '#');
