ALTER TABLE objects
ADD COLUMN IF NOT EXISTS tenure text,
ADD COLUMN IF NOT EXISTS plot_area integer,
ADD COLUMN IF NOT EXISTS construction_year integer,
ADD COLUMN IF NOT EXISTS bedrooms text,
ADD COLUMN IF NOT EXISTS operating_cost_yearly integer,
ADD COLUMN IF NOT EXISTS energy_class text,
ADD COLUMN IF NOT EXISTS monthly_fee integer,
ADD COLUMN IF NOT EXISTS standard_class text,
ADD COLUMN IF NOT EXISTS renovations jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS heating text,
ADD COLUMN IF NOT EXISTS ventilation text,
ADD COLUMN IF NOT EXISTS parking text;
