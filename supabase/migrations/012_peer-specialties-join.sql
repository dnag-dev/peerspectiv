BEGIN;

-- specialty_taxonomy — seedable canonical list
CREATE TABLE IF NOT EXISTS specialty_taxonomy (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO specialty_taxonomy (name) VALUES
  ('Family Medicine'), ('Internal Medicine'), ('Pediatrics'), ('OB/GYN'),
  ('Behavioral Health'), ('Dental'), ('Cardiology'), ('Dermatology'),
  ('Emergency Medicine'), ('HIV'), ('Other')
ON CONFLICT (name) DO NOTHING;

-- peer_specialties — multi-select per peer with verification status
CREATE TABLE IF NOT EXISTS peer_specialties (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  peer_id uuid NOT NULL REFERENCES peers(id) ON DELETE CASCADE,
  specialty text NOT NULL,
  verified_status text NOT NULL DEFAULT 'pending'
    CHECK (verified_status IN ('verified','not_verified','pending')),
  verified_by text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (peer_id, specialty)
);

CREATE INDEX IF NOT EXISTS idx_peer_specialties_peer ON peer_specialties(peer_id);
CREATE INDEX IF NOT EXISTS idx_peer_specialties_specialty ON peer_specialties(specialty);

-- Copy from peers.specialties array (and peers.specialty scalar) → join table.
INSERT INTO peer_specialties (peer_id, specialty, verified_status)
SELECT p.id, TRIM(s) AS specialty, 'verified'
FROM peers p, unnest(coalesce(p.specialties, ARRAY[p.specialty])) AS s
WHERE coalesce(p.specialties, ARRAY[p.specialty]) IS NOT NULL
  AND TRIM(coalesce(s, '')) <> ''
ON CONFLICT (peer_id, specialty) DO NOTHING;

COMMIT;
