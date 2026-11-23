-- Supabase servis rollerinin şifreleri (.env'deki POSTGRES_PASSWORD).
-- Resmî betikten farkı: Edge Functions kurulmadığı için supabase_functions_admin rolü yok.
\set pgpass `echo "$POSTGRES_PASSWORD"`

ALTER USER authenticator WITH PASSWORD :'pgpass';
ALTER USER pgbouncer WITH PASSWORD :'pgpass';
ALTER USER supabase_auth_admin WITH PASSWORD :'pgpass';
ALTER USER supabase_storage_admin WITH PASSWORD :'pgpass';
