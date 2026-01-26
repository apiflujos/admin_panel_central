ALTER TABLE invoice_settings
  ADD COLUMN bank_account_id TEXT,
  ADD COLUMN apply_payment BOOLEAN NOT NULL DEFAULT false;
