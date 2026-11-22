select cron.schedule('ronda-pak-join-drafts','*/5 * * * *','select ronda_private.clean_join_drafts()');
