-- Habilita RLS em public.users e public.audit_logs (estavam totalmente expostas
-- pra role anon via API REST - qualquer um podia ler/escrever todas as 65 linhas
-- de usuários, incluindo telefone/CPF/nome). Testado exaustivamente em staging
-- (branch Supabase) antes de aplicar aqui: 11 cenários (anon lê organizador de
-- evento publicado, anon bloqueado de ler outros perfis, usuário lê/atualiza/exclui
-- o próprio perfil, usuário comum bloqueado de alterar perfil de outro, admin
-- promove/gerencia qualquer usuário, políticas de admin nas outras 9 tabelas
-- continuam resolvendo, trigger de cadastro continua funcionando).
--
-- Achado durante o teste: uma policy de admin que referencia a própria tabela
-- "users" (com users com RLS desligado até agora, nunca dava problema) causa
-- "infinite recursion detected in policy" assim que RLS é ligado - e o mesmo
-- vale pras policies de admin nas OUTRAS tabelas (registrations, events, etc.),
-- porque agora elas também acionam a RLS de "users" ao verificar o cargo do
-- usuário. Corrigido com uma função SECURITY DEFINER (is_admin()), que evita a
-- releitura recursiva das próprias políticas de "users".

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
$$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia todos os usuários"
ON public.users FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Usuários excluem própria conta"
ON public.users FOR DELETE
USING (auth.uid() = id);

CREATE POLICY "Perfil de organizador de evento publicado é público"
ON public.users FOR SELECT
USING (EXISTS (SELECT 1 FROM events WHERE events.organizer_id = users.id AND events.status = 'published'));

-- Substitui o subquery cru "EXISTS (SELECT 1 FROM users WHERE ...)" por is_admin()
-- em toda policy de admin já existente noutras tabelas, pra evitar a recursão acima.
DROP POLICY IF EXISTS "Admin exclui coupons" ON public.coupons;
CREATE POLICY "Admin exclui coupons" ON public.coupons FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Admin visualiza coupons" ON public.coupons;
CREATE POLICY "Admin visualiza coupons" ON public.coupons FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admin gerencia todas as distâncias" ON public.event_distances;
CREATE POLICY "Admin gerencia todas as distâncias" ON public.event_distances FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admin exclui fotos" ON public.event_photos;
CREATE POLICY "Admin exclui fotos" ON public.event_photos FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Admin vê todos eventos" ON public.events;
CREATE POLICY "Admin vê todos eventos" ON public.events FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admin exclui favoritos" ON public.favorites;
CREATE POLICY "Admin exclui favoritos" ON public.favorites FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Admin acessa tudo" ON public.leo_conversations;
CREATE POLICY "Admin acessa tudo" ON public.leo_conversations FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin gerencia todos tipos de inscrição" ON public.registration_types;
CREATE POLICY "Admin gerencia todos tipos de inscrição" ON public.registration_types FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admin vê todas inscrições" ON public.registrations;
CREATE POLICY "Admin vê todas inscrições" ON public.registrations FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admin exclui reviews" ON public.reviews;
CREATE POLICY "Admin exclui reviews" ON public.reviews FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Admin exclui termo aceites" ON public.termo_aceites;
CREATE POLICY "Admin exclui termo aceites" ON public.termo_aceites FOR DELETE USING (public.is_admin());
