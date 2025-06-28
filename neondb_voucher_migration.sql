-- NeonDB Voucher Migration Script
-- This script creates the vouchers table and updates the orders table to use vouchers instead of promotions

-- Create vouchers table
CREATE TABLE IF NOT EXISTS vouchers (
    id VARCHAR PRIMARY KEY,
    code VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    description TEXT,
    start_date BIGINT NOT NULL,
    end_date BIGINT NOT NULL,
    voucher_type VARCHAR CHECK (voucher_type IN ('FIXED', 'PERCENTAGE', 'FREESHIP')) NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    maximum_discount_amount DECIMAL(10,2),
    minimum_order_value DECIMAL(10,2),
    avatar JSONB,
    status VARCHAR CHECK (status IN ('ACTIVE', 'EXPIRED', 'PENDING', 'CANCELLED', 'EXHAUSTED')) DEFAULT 'PENDING',
    scope VARCHAR CHECK (scope IN ('ALL_CUSTOMERS', 'NEW_CUSTOMERS', 'RETURNING_CUSTOMERS', 'SPECIFIC_CUSTOMERS')) DEFAULT 'ALL_CUSTOMERS',
    current_usage INTEGER DEFAULT 0,
    maximum_usage INTEGER,
    usage_limit_per_customer INTEGER DEFAULT 1,
    applicable_days JSONB,
    applicable_time_ranges JSONB,
    applicable_food_category_ids TEXT[] DEFAULT '{}',
    applicable_restaurant_ids TEXT[] DEFAULT '{}',
    excluded_food_category_ids TEXT[] DEFAULT '{}',
    excluded_restaurant_ids TEXT[] DEFAULT '{}',
    specific_customer_ids TEXT[] DEFAULT '{}',
    minimum_orders_required INTEGER,
    minimum_total_spent DECIMAL(10,2),
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);
CREATE INDEX IF NOT EXISTS idx_vouchers_type ON vouchers(voucher_type);
CREATE INDEX IF NOT EXISTS idx_vouchers_dates ON vouchers(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_vouchers_scope ON vouchers(scope);
CREATE INDEX IF NOT EXISTS idx_vouchers_restaurant_ids ON vouchers USING GIN(applicable_restaurant_ids);
CREATE INDEX IF NOT EXISTS idx_vouchers_food_category_ids ON vouchers USING GIN(applicable_food_category_ids);

-- Add vouchers_applied column to orders table (replace promotions_applied)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vouchers_applied JSONB DEFAULT '[]';

-- Remove old promotions_applied column if it exists
ALTER TABLE orders DROP COLUMN IF EXISTS promotions_applied;

-- Drop the order_promotions junction table if it exists
DROP TABLE IF EXISTS order_promotions;

-- Update orders table to ensure discount_amount column exists
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;

-- Create function to automatically update voucher timestamps
CREATE OR REPLACE FUNCTION update_voucher_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS trigger_update_voucher_timestamp ON vouchers;
CREATE TRIGGER trigger_update_voucher_timestamp
    BEFORE UPDATE ON vouchers
    FOR EACH ROW
    EXECUTE FUNCTION update_voucher_timestamp();

-- Insert sample vouchers for testing
INSERT INTO vouchers (
    id, code, name, description, start_date, end_date, voucher_type, 
    discount_value, minimum_order_value, status, scope, maximum_usage, 
    created_at, updated_at
) VALUES 
(
    'VOUCHER_001',
    'WELCOME10',
    'Welcome Discount',
    '10% off for new customers',
    EXTRACT(EPOCH FROM NOW())::BIGINT,
    EXTRACT(EPOCH FROM NOW() + INTERVAL '30 days')::BIGINT,
    'PERCENTAGE',
    10.00,
    50.00,
    'ACTIVE',
    'NEW_CUSTOMERS',
    1000,
    EXTRACT(EPOCH FROM NOW())::BIGINT,
    EXTRACT(EPOCH FROM NOW())::BIGINT
),
(
    'VOUCHER_002',
    'SAVE20',
    'Save $20',
    'Fixed $20 discount on orders over $100',
    EXTRACT(EPOCH FROM NOW())::BIGINT,
    EXTRACT(EPOCH FROM NOW() + INTERVAL '60 days')::BIGINT,
    'FIXED',
    20.00,
    100.00,
    'ACTIVE',
    'ALL_CUSTOMERS',
    500,
    EXTRACT(EPOCH FROM NOW())::BIGINT,
    EXTRACT(EPOCH FROM NOW())::BIGINT
),
(
    'VOUCHER_003',
    'FREESHIP',
    'Free Shipping',
    'Free delivery on any order',
    EXTRACT(EPOCH FROM NOW())::BIGINT,
    EXTRACT(EPOCH FROM NOW() + INTERVAL '90 days')::BIGINT,
    'FREESHIP',
    0.00,
    25.00,
    'ACTIVE',
    'ALL_CUSTOMERS',
    NULL,
    EXTRACT(EPOCH FROM NOW())::BIGINT,
    EXTRACT(EPOCH FROM NOW())::BIGINT
),
(
    'VOUCHER_004',
    'WEEKEND15',
    'Weekend Special',
    '15% off on weekends only',
    EXTRACT(EPOCH FROM NOW())::BIGINT,
    EXTRACT(EPOCH FROM NOW() + INTERVAL '120 days')::BIGINT,
    'PERCENTAGE',
    15.00,
    75.00,
    'ACTIVE',
    'ALL_CUSTOMERS',
    NULL,
    EXTRACT(EPOCH FROM NOW())::BIGINT,
    EXTRACT(EPOCH FROM NOW())::BIGINT
);

-- Update the weekend voucher to only apply on weekends (Saturday=6, Sunday=0)
UPDATE vouchers 
SET applicable_days = '[0, 6]'::JSONB
WHERE code = 'WEEKEND15';

-- Create helper function to check if a voucher is eligible for a customer
CREATE OR REPLACE FUNCTION is_voucher_eligible_for_customer(
    voucher_id VARCHAR,
    customer_id VARCHAR,
    customer_order_count INTEGER DEFAULT 0
) RETURNS BOOLEAN AS $$
DECLARE
    voucher_record vouchers%ROWTYPE;
    customer_usage_count INTEGER;
BEGIN
    -- Get voucher details
    SELECT * INTO voucher_record FROM vouchers WHERE id = voucher_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if voucher is active and not expired
    IF voucher_record.status != 'ACTIVE' OR 
       EXTRACT(EPOCH FROM NOW())::BIGINT > voucher_record.end_date OR
       EXTRACT(EPOCH FROM NOW())::BIGINT < voucher_record.start_date THEN
        RETURN FALSE;
    END IF;
    
    -- Check maximum usage
    IF voucher_record.maximum_usage IS NOT NULL AND 
       voucher_record.current_usage >= voucher_record.maximum_usage THEN
        RETURN FALSE;
    END IF;
    
    -- Check scope eligibility
    IF voucher_record.scope = 'NEW_CUSTOMERS' AND customer_order_count > 0 THEN
        RETURN FALSE;
    END IF;
    
    IF voucher_record.scope = 'RETURNING_CUSTOMERS' AND customer_order_count = 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Check specific customer eligibility
    IF voucher_record.scope = 'SPECIFIC_CUSTOMERS' AND 
       NOT (customer_id = ANY(voucher_record.specific_customer_ids)) THEN
        RETURN FALSE;
    END IF;
    
    -- Check minimum orders required
    IF voucher_record.minimum_orders_required IS NOT NULL AND 
       customer_order_count < voucher_record.minimum_orders_required THEN
        RETURN FALSE;
    END IF;
    
    -- Check customer usage limit
    SELECT COUNT(*) INTO customer_usage_count
    FROM orders 
    WHERE customer_id = $2 
    AND vouchers_applied @> jsonb_build_array(jsonb_build_object('id', voucher_id));
    
    IF customer_usage_count >= voucher_record.usage_limit_per_customer THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create helper function to calculate voucher discount
CREATE OR REPLACE FUNCTION calculate_voucher_discount(
    voucher_id VARCHAR,
    order_total DECIMAL(10,2),
    delivery_fee DECIMAL(10,2) DEFAULT 0
) RETURNS DECIMAL(10,2) AS $$
DECLARE
    voucher_record vouchers%ROWTYPE;
    discount_amount DECIMAL(10,2) := 0;
BEGIN
    SELECT * INTO voucher_record FROM vouchers WHERE id = voucher_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    CASE voucher_record.voucher_type
        WHEN 'FIXED' THEN
            discount_amount := voucher_record.discount_value;
        WHEN 'PERCENTAGE' THEN
            discount_amount := order_total * (voucher_record.discount_value / 100);
            IF voucher_record.maximum_discount_amount IS NOT NULL THEN
                discount_amount := LEAST(discount_amount, voucher_record.maximum_discount_amount);
            END IF;
        WHEN 'FREESHIP' THEN
            discount_amount := delivery_fee;
        ELSE
            discount_amount := 0;
    END CASE;
    
    RETURN GREATEST(0, discount_amount);
END;
$$ LANGUAGE plpgsql;

-- Migration complete message
DO $$
BEGIN
    RAISE NOTICE 'Voucher migration completed successfully!';
    RAISE NOTICE 'Created vouchers table with % sample vouchers', (SELECT COUNT(*) FROM vouchers);
    RAISE NOTICE 'Updated orders table to use vouchers_applied instead of promotions_applied';
END $$; 