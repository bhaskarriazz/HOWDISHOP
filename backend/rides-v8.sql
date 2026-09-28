-- Additive preview-only schema. No approved Works/HPay tables are changed.
CREATE TABLE IF NOT EXISTS howdi_ride_applications (
 code TEXT PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id), vehicle_class TEXT NOT NULL CHECK(vehicle_class IN ('Auto','Cab')),
 zone TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'draft', details JSONB NOT NULL, checks JSONB NOT NULL DEFAULT '{}',
 reason TEXT NOT NULL DEFAULT '', available BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(user_id,vehicle_class));
CREATE TABLE IF NOT EXISTS howdi_ride_documents (application_code TEXT REFERENCES howdi_ride_applications(code),kind TEXT NOT NULL,image TEXT NOT NULL,PRIMARY KEY(application_code,kind));
CREATE TABLE IF NOT EXISTS howdi_ride_quotes (code TEXT PRIMARY KEY,user_id BIGINT NOT NULL REFERENCES users(id),quote JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS howdi_rides (
 code TEXT PRIMARY KEY, customer_id BIGINT NOT NULL REFERENCES users(id), driver_id BIGINT REFERENCES users(id), request_key TEXT NOT NULL,
 quote_code TEXT UNIQUE NOT NULL REFERENCES howdi_ride_quotes(code), quote JSONB NOT NULL, state TEXT NOT NULL DEFAULT 'requested',
 customer_consent BOOLEAN NOT NULL DEFAULT FALSE,driver_consent BOOLEAN NOT NULL DEFAULT FALSE,pin TEXT,pin_attempts INTEGER NOT NULL DEFAULT 0,pin_expires_at TIMESTAMPTZ,
 offer_expires_at TIMESTAMPTZ,reason TEXT,payment_state TEXT NOT NULL DEFAULT 'pending',payout_state TEXT NOT NULL DEFAULT 'held',held_by TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(customer_id,request_key));
CREATE INDEX IF NOT EXISTS howdi_rides_driver ON howdi_rides(driver_id,state);
CREATE TABLE IF NOT EXISTS howdi_ride_declines (ride_code TEXT REFERENCES howdi_rides(code),user_id BIGINT REFERENCES users(id),PRIMARY KEY(ride_code,user_id));
CREATE TABLE IF NOT EXISTS howdi_ride_events (id BIGSERIAL PRIMARY KEY,ref TEXT NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,detail JSONB NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS howdi_ride_notices (id BIGSERIAL PRIMARY KEY,user_id BIGINT REFERENCES users(id),ref TEXT NOT NULL,message TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS howdi_ride_ledger (ride_code TEXT REFERENCES howdi_rides(code),kind TEXT NOT NULL,amount INTEGER NOT NULL,payment TEXT NOT NULL CHECK(payment IN ('cash','hpay_test')),reference TEXT UNIQUE NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(ride_code,kind));
CREATE TABLE IF NOT EXISTS howdi_ride_cases (code TEXT PRIMARY KEY,ride_code TEXT REFERENCES howdi_rides(code),user_id BIGINT REFERENCES users(id),kind TEXT NOT NULL,reason TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'open',resolution TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS howdi_ride_ratings (ride_code TEXT REFERENCES howdi_rides(code),user_id BIGINT REFERENCES users(id),stars INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),PRIMARY KEY(ride_code,user_id));
CREATE TABLE IF NOT EXISTS howdi_ride_zones (zone TEXT NOT NULL,vehicle_class TEXT NOT NULL,paused BOOLEAN NOT NULL DEFAULT FALSE,reason TEXT NOT NULL,PRIMARY KEY(zone,vehicle_class));
ALTER TABLE howdi_rides ADD COLUMN IF NOT EXISTS offered_to BIGINT REFERENCES users(id);
-- Provision only by a trusted database operator, never from a customer/staff HTTP body.
CREATE TABLE IF NOT EXISTS howdi_ride_staff_identity (username TEXT PRIMARY KEY,user_id BIGINT NOT NULL REFERENCES users(id));
ALTER TABLE howdi_rides ADD COLUMN IF NOT EXISTS match_until TIMESTAMPTZ;
ALTER TABLE howdi_ride_zones ADD COLUMN IF NOT EXISTS preview_checks JSONB NOT NULL DEFAULT '{}';
CREATE TABLE IF NOT EXISTS howdi_ride_offers (
 code TEXT PRIMARY KEY, ride_code TEXT NOT NULL REFERENCES howdi_rides(code), driver_id BIGINT NOT NULL REFERENCES users(id),
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','accepted','declined','expired','cancelled')),
 expires_at TIMESTAMPTZ NOT NULL, responded_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(ride_code,driver_id));
CREATE UNIQUE INDEX IF NOT EXISTS howdi_ride_offer_pending_driver ON howdi_ride_offers(driver_id) WHERE state='pending';
CREATE UNIQUE INDEX IF NOT EXISTS howdi_ride_offer_pending_ride ON howdi_ride_offers(ride_code) WHERE state='pending';
