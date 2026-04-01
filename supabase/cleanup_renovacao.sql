
-- =============================================================
-- 🧹 CLEANUP: REMOVE PASTELARIA RENOVAÇÃO DATA
-- =============================================================

BEGIN;

-- 1. Get the restaurant ID
DO $$
DECLARE
    v_rest_id INT;
BEGIN
    SELECT id INTO v_rest_id FROM restaurants WHERE name = 'Pastelaria Renovação';

    IF v_rest_id IS NOT NULL THEN
        -- 2. Delete related data
        DELETE FROM menu_items WHERE restaurant_id = v_rest_id;
        DELETE FROM addons WHERE restaurant_id = v_rest_id;
        DELETE FROM combos WHERE restaurant_id = v_rest_id;
        DELETE FROM menu_categories WHERE restaurant_id = v_rest_id;
        DELETE FROM restaurants WHERE id = v_rest_id;
        
        RAISE NOTICE '✅ Pastelaria Renovação data removed (ID: %).', v_rest_id;
    ELSE
        RAISE NOTICE 'ℹ️ Pastelaria Renovação not found.';
    END IF;
END $$;

-- 3. Cleanup Auth if exists
DO $$
DECLARE
    v_uid UUID;
BEGIN
    SELECT id INTO v_uid FROM auth.users WHERE email = 'renovacao@guarafood.com.br';

    IF v_uid IS NOT NULL THEN
        DELETE FROM auth.identities WHERE user_id = v_uid;
        DELETE FROM auth.sessions WHERE user_id = v_uid;
        DELETE FROM public.profiles WHERE id = v_uid;
        DELETE FROM auth.users WHERE id = v_uid;
        RAISE NOTICE '✅ Auth user renovacao@guarafood.com.br removed.';
    END IF;
END $$;

COMMIT;
