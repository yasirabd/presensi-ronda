create extension if not exists pg_cron;
select cron.schedule('rondahadir-retensi','15 2 * * *','select ronda_private.apply_retention()');
