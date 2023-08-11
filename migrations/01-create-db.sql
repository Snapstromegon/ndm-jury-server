CREATE TABLE IF NOT EXISTS 'registrations' (
  'id' INTEGER PRIMARY KEY AUTOINCREMENT,
  'firstname' TEXT,
  'lastname' TEXT,
  'email' TEXT,
  'team' TEXT,
  'jurycode' TEXT UNIQUE,
  'judges' TEXT,
  'created_at' DATETIME DEFAULT CURRENT_TIMESTAMP,
  'updated_at' DATETIME DEFAULT CURRENT_TIMESTAMP
)
