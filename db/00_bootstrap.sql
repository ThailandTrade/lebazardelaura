-- Bootstrap : rôle applicatif à privilèges minimaux.
-- À exécuter en SUPERUSER sur la base 'postgres' AVANT de créer la base bazar_laura.
--   sudo -u postgres psql -f db/00_bootstrap.sql
--
-- ⚠️ Remplace 'CHANGE_ME' par un mot de passe fort et reporte-le dans DATABASE_URL
--    (.env.local sur le VPS).
do $$
begin
  if not exists (select from pg_roles where rolname = 'bazar_app') then
    create role bazar_app login password 'CHANGE_ME';
  end if;
end $$;

-- Ensuite (commandes séparées, voir DEPLOYMENT.md) :
--   sudo -u postgres createdb -O postgres bazar_laura
--   sudo -u postgres psql -d postgres -c "grant connect on database bazar_laura to bazar_app"
--   sudo -u postgres psql -d bazar_laura -f db/01_schema.sql
--   sudo -u postgres psql -d bazar_laura -f db/02_grants.sql
--   sudo -u postgres psql -d bazar_laura -f db/03_quantity.sql   (inclus dans 01 pour un setup neuf)
