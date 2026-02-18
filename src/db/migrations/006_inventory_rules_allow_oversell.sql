ALTER TABLE inventory_rules
  ADD COLUMN IF NOT EXISTS allow_oversell BOOLEAN NOT NULL DEFAULT false;
