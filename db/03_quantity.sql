-- Ajoute une quantité (nombre d'exemplaires) par livre.
alter table books add column if not exists quantity int not null default 1;
