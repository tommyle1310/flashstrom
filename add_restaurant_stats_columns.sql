-- SQL Script to add new columns to restaurant_stats_records table
-- Execute this script in your SQL editor to update the table structure

-- Add enhanced analytics columns
ALTER TABLE restaurant_stats_records 
ADD COLUMN IF NOT EXISTS average_order_value REAL DEFAULT 0;

ALTER TABLE restaurant_stats_records 
ADD COLUMN IF NOT EXISTS order_completion_rate REAL DEFAULT 0;

ALTER TABLE restaurant_stats_records 
ADD COLUMN IF NOT EXISTS revenue_growth_rate REAL DEFAULT 0;

-- Add JSON columns for complex analytics data
ALTER TABLE restaurant_stats_records 
ADD COLUMN IF NOT EXISTS peak_hours_analysis JSONB DEFAULT '{}';

ALTER TABLE restaurant_stats_records 
ADD COLUMN IF NOT EXISTS rating_summary JSONB DEFAULT '{}';

ALTER TABLE restaurant_stats_records 
ADD COLUMN IF NOT EXISTS order_status_summary JSONB DEFAULT '{}';

ALTER TABLE restaurant_stats_records 
ADD COLUMN IF NOT EXISTS popular_items JSONB DEFAULT '{}';

ALTER TABLE restaurant_stats_records 
ADD COLUMN IF NOT EXISTS revenue_insights JSONB DEFAULT '{}';

ALTER TABLE restaurant_stats_records 
ADD COLUMN IF NOT EXISTS performance_metrics JSONB DEFAULT '{}';

ALTER TABLE restaurant_stats_records 
ADD COLUMN IF NOT EXISTS financial_breakdown JSONB DEFAULT '{}';

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_restaurant_stats_period_type ON restaurant_stats_records(period_type);
CREATE INDEX IF NOT EXISTS idx_restaurant_stats_restaurant_period ON restaurant_stats_records(restaurant_id, period_type);
CREATE INDEX IF NOT EXISTS idx_restaurant_stats_period_range ON restaurant_stats_records(period_start, period_end);

-- Optional: Update existing records to have proper default JSON values if they have NULL
UPDATE restaurant_stats_records 
SET 
  peak_hours_analysis = '{}' WHERE peak_hours_analysis IS NULL,
  rating_summary = '{}' WHERE rating_summary IS NULL,
  order_status_summary = '{}' WHERE order_status_summary IS NULL,
  popular_items = '{}' WHERE popular_items IS NULL,
  revenue_insights = '{}' WHERE revenue_insights IS NULL,
  performance_metrics = '{}' WHERE performance_metrics IS NULL,
  financial_breakdown = '{}' WHERE financial_breakdown IS NULL; 