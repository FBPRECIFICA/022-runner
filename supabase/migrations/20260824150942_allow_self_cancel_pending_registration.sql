-- Permite que o próprio usuário cancele uma inscrição pendente dele (mesmo
-- CPF/evento), pra poder refazer a inscrição num kit diferente sem precisar
-- de suporte manual. Hoje só existia INSERT livre e SELECT da própria — não
-- havia nenhuma policy de UPDATE pra usuário comum.
--
-- USING restringe a linha alvo a: dona da inscrição + ainda pendente.
-- WITH CHECK restringe o resultado a: continua sendo dona + status vira
-- exatamente 'cancelled' (bloqueia usar essa policy pra "confirmar" a
-- própria inscrição ou mudar pra qualquer outro status).
--
-- Ver migration seguinte (restrict_self_cancel_to_no_payment_started) pra
-- um guard adicional que fechou uma brecha encontrada logo depois desta.

CREATE POLICY "Usuários cancelam própria inscrição pendente"
ON public.registrations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'cancelled');
