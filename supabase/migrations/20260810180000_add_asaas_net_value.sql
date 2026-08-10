ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS asaas_net_value numeric;
COMMENT ON COLUMN public.registrations.asaas_net_value IS 'Valor líquido real informado pelo Asaas (campo netValue) no momento da confirmação do pagamento — não é estimativa.';
