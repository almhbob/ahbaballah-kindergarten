-- Apply once to the same PostgreSQL database used by the application.
-- A unique key is the final concurrency-safe guard against duplicate check-outs.
CREATE TABLE IF NOT EXISTS student_dismissals (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id TEXT NOT NULL,
  school_date DATE NOT NULL,
  dismissed_at TIMESTAMPTZ NOT NULL,
  receiver_name TEXT NOT NULL,
  receiver_relationship TEXT NOT NULL,
  authorized_pickup_confirmed BOOLEAN NOT NULL CHECK (authorized_pickup_confirmed = TRUE),
  actor_user_id BIGINT NOT NULL REFERENCES users(id),
  actor_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT student_dismissals_one_per_student_day UNIQUE (student_id, school_date)
);

CREATE INDEX IF NOT EXISTS student_dismissals_school_date_idx
  ON student_dismissals (school_date);
