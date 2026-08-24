-- Fecha uma brecha da policy anterior (allow_self_cancel_pending_registration):
-- o asaas-webhook roda com service_role (ignora RLS) e faz
-- `UPDATE registrations SET status='paid' WHERE id=...` sem checar o status
-- atual. Se um usuário pudesse auto-cancelar uma pendente que já tem
-- cobrança Asaas gerada (asaas_payment_id preenchido) e essa cobrança fosse
-- paga depois, o webhook reescreveria o status de volta pra 'paid' —
-- reproduzindo o tipo de bug de sobrescrita de status que já causou
-- incidente neste projeto (checklist de raio de impacto no CLAUDE.md).
--
-- Com este guard, só dá pra auto-cancelar quem nunca chegou a gerar
-- PIX/boleto/cartão pra aquela inscrição. Quem já gerou cobrança continua só
-- com a opção de terminar o pagamento (ou suporte manual cancelar depois de
-- confirmar com a Asaas que a cobrança não vai ser paga).
--
-- Testado em staging (branch efêmera, deletada após o teste): pendente COM
-- asaas_payment_id não é cancelável pelo dono (0 linhas) ✓; pendente SEM
-- asaas_payment_id continua cancelável normalmente ✓.

ALTER POLICY "Usuários cancelam própria inscrição pendente"
ON public.registrations
USING (auth.uid() = user_id AND status = 'pending' AND asaas_payment_id IS NULL)
WITH CHECK (auth.uid() = user_id AND status = 'cancelled');
