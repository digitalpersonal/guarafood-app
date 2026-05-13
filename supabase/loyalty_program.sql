-- Script: Adicionar Clube de Pontos (Loyalty Program)

DO $$ 
BEGIN
    -- 1. Adicionar colunas de configuração na tabela 'restaurants'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'loyalty_program') THEN
        ALTER TABLE restaurants ADD COLUMN loyalty_program JSONB DEFAULT '{"active": false, "pointsPerReal": 1, "rewardThreshold": 100, "rewardType": "FIXED_DISCOUNT", "rewardValue": 10}'::jsonb;
    END IF;

    -- 2. Criar tabela de Pontos de Clientes (customer_loyalty)
    CREATE TABLE IF NOT EXISTS customer_loyalty (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
        customer_phone TEXT NOT NULL,
        customer_name TEXT,
        points INTEGER DEFAULT 0,
        redeemed_points INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
        UNIQUE(restaurant_id, customer_phone)
    );

    -- 3. Habilitar RLS (Row Level Security) mas permitir leitura publica para simplificar (ou restrito via app)
    ALTER TABLE customer_loyalty ENABLE ROW LEVEL SECURITY;

    -- Criar politicas para customer_loyalty
    DROP POLICY IF EXISTS "Permitir leitura anonima baseada no telefone" ON customer_loyalty;
    CREATE POLICY "Permitir leitura anonima baseada no telefone" 
    ON customer_loyalty FOR SELECT 
    USING (true);

    DROP POLICY IF EXISTS "Permitir escrita anonima (via pedidos)" ON customer_loyalty;
    CREATE POLICY "Permitir escrita anonima (via pedidos)" 
    ON customer_loyalty FOR ALL 
    USING (true) WITH CHECK (true);

    -- Indexes para performance
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'customer_loyalty' AND indexname = 'idx_loyalty_phone') THEN
        CREATE INDEX idx_loyalty_phone ON customer_loyalty(customer_phone);
    END IF;

    -- 4. Criar a Function e Trigger para premiar pontos automaticamente!
    CREATE OR REPLACE FUNCTION award_loyalty_points()
    RETURNS TRIGGER AS $trigger_body$
    DECLARE
        v_restaurant_loyalty JSONB;
        v_active BOOLEAN;
        v_points_per_real NUMERIC;
        v_earned_points INTEGER;
    BEGIN
        -- Se o status mudou para 'Entregue' (Para entregas) ou 'payment_status' mudou para 'paid' (Para Mesas/Balcao)
        IF (NEW.status = 'Entregue' AND OLD.status IS DISTINCT FROM 'Entregue') OR 
           (NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid') THEN
           
            SELECT loyalty_program INTO v_restaurant_loyalty FROM restaurants WHERE id = NEW.restaurant_id;
            
            IF v_restaurant_loyalty IS NOT NULL THEN
                v_active := (v_restaurant_loyalty->>'active')::boolean;
                v_points_per_real := (v_restaurant_loyalty->>'pointsPerReal')::numeric;
                
                IF v_active AND v_points_per_real > 0 AND NEW.customer_phone IS NOT NULL AND NEW.customer_phone != '' THEN
                    -- Calcula
                    -- total_price é numerico, convertemos e arredondamos
                    v_earned_points := floor(NEW.total_price * v_points_per_real);
                    
                    IF v_earned_points > 0 THEN
                        INSERT INTO customer_loyalty (restaurant_id, customer_phone, customer_name, points)
                        VALUES (NEW.restaurant_id, NEW.customer_phone, NEW.customer_name, v_earned_points)
                        ON CONFLICT (restaurant_id, customer_phone)
                        DO UPDATE SET 
                            points = customer_loyalty.points + EXCLUDED.points,
                            customer_name = EXCLUDED.customer_name,
                            updated_at = now();
                    END IF;
                END IF;
            END IF;
        END IF;
        
        RETURN NEW;
    END;
    $trigger_body$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_award_loyalty_points ON orders;
    CREATE TRIGGER trigger_award_loyalty_points
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION award_loyalty_points();

END $$;
