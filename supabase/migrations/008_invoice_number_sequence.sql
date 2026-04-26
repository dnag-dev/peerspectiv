-- 008 — Invoice number sequence
-- Atomic monotonic invoice numbering. Format generated in app:
-- INV-{YYYY}-{6-digit zero-padded nextval}
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1 INCREMENT 1;
