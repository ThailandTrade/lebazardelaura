-- Privilèges minimaux pour le rôle applicatif bazar_app.
-- À exécuter en tant que superuser sur la base bazar_laura, APRÈS 01_schema.sql.
-- Les tables appartiennent à postgres ; bazar_app n'a que le DML, pas de DDL.

grant usage on schema public to bazar_app;

grant select, insert, update, delete on books to bazar_app;
grant select, insert, update, delete on admin_users to bazar_app;

-- futures tables créées par postgres dans public → mêmes droits pour bazar_app
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to bazar_app;
