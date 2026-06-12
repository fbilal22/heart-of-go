ALTER TABLE public.savings_goals
  ADD COLUMN IF NOT EXISTS auto_debit_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_debit_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS auto_debit_day smallint CHECK (auto_debit_day BETWEEN 1 AND 28),
  ADD COLUMN IF NOT EXISTS auto_debit_last_run date;