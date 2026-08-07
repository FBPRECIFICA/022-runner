-- registrations.registration_number era UNIQUE globalmente, mas fn_auto_registration_number
-- numera "001", "002"... por evento (via events.registration_counter). Isso ia travar o
-- checkout assim que dois eventos tivessem inscrições com o mesmo número. Corrigido para
-- UNIQUE composta (event_id, registration_number): cada evento numera de forma independente.
ALTER TABLE public.registrations DROP CONSTRAINT registrations_registration_number_key;
ALTER TABLE public.registrations ADD CONSTRAINT registrations_event_id_registration_number_key UNIQUE (event_id, registration_number);
