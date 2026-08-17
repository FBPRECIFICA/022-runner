-- Migração de baseline, reconstruída em 17/08/2026 via introspecção do schema
-- de produção (não é uma mudança nova — captura o schema que já existia ANTES
-- do histórico de migrations rastreadas começar, em 05/06/2026).
--
-- Por que isso existe: a tabela supabase_migrations.schema_migrations só tinha
-- ALTER TABLEs incrementais a partir de "add_event_columns_bloco29" (05/06),
-- que já assumem que as tabelas base (events, registrations, users, etc.) já
-- existem. Sem essa baseline, criar um branch/staging novo do zero falha
-- imediatamente ("relation events does not exist") — foi descoberto tentando
-- montar o ambiente de staging aprovado em 17/08/2026.
--
-- Todo CREATE TABLE usa IF NOT EXISTS por segurança, mas o uso real é: essa
-- migration é inserida em produção só como registro (sem executar o DDL, já
-- que os objetos já existem lá) e passa a ser replayada de verdade só quando
-- um branch novo é criado a partir de um banco vazio.
--
-- IMPORTANTE - descoberto testando: "registration_types" e "event_distances"
-- NÃO fazem parte dessa baseline, mesmo existindo hoje em produção - essas
-- duas tabelas foram criadas inteiramente por migrations JÁ rastreadas
-- ("registration_types" 20260807023533, "create_event_distances_table"
-- 20260813133423), com CREATE TABLE sem IF NOT EXISTS. Incluí-las aqui
-- causava "relation already exists" ao reproduzir o histórico. Pelo mesmo
-- motivo, as colunas registration_type_id/name/price em "registrations" e a
-- unique key "registrations_event_id_registration_number_key" também ficam
-- de fora - são adicionadas por migrations já rastreadas (a segunda troca a
-- baseline original "registrations_registration_number_key", que essa
-- migration reconstrói de propósito, senão o DROP CONSTRAINT daquela
-- migration não teria o que remover). Mesma lógica pra policy "Admin
-- visualiza coupons" (criada pela migration "bloco85_admin_select_coupons").

-- ===== TABLES =====
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  action text,
  details jsonb,
  ip_hint text,
  created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid,
  code text,
  discount_type text,
  discount_value numeric(10,2),
  valid_until timestamp without time zone,
  max_uses integer,
  current_uses integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  organizer_id uuid,
  active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.event_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid,
  url text NOT NULL,
  caption text,
  uploaded_by uuid,
  created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  ai_description text,
  date timestamp without time zone NOT NULL,
  city text NOT NULL,
  location text,
  organizer_id uuid,
  distances jsonb DEFAULT '[]'::jsonb,
  prices jsonb DEFAULT '[]'::jsonb,
  photos text[] DEFAULT '{}'::text[],
  banner_url text,
  status text DEFAULT 'draft'::text,
  plan text DEFAULT 'free'::text,
  quality_score integer DEFAULT 0,
  max_participants integer,
  current_participants integer DEFAULT 0,
  registration_deadline timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  route_coordinates jsonb,
  latitude double precision,
  longitude double precision,
  additional_info text,
  sponsors jsonb DEFAULT '[]'::jsonb,
  kit_items jsonb DEFAULT '[]'::jsonb,
  event_type text,
  regulations text,
  registration_counter integer DEFAULT 0,
  link_percurso text
);

CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  event_id uuid,
  created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leo_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  question text NOT NULL,
  answer text NOT NULL,
  page_url text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.newsletter (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  email text,
  city text,
  interests jsonb,
  created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info'::text,
  read boolean DEFAULT false,
  link text,
  created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid,
  user_id uuid,
  distance text,
  price numeric(10,2),
  status text DEFAULT 'pending'::text,
  payment_status text DEFAULT 'pending'::text,
  registration_number text,
  qr_code text,
  created_at timestamp without time zone DEFAULT now(),
  name text,
  cpf text,
  phone text,
  birth_date date,
  gender text,
  shirt_size text,
  city text,
  checkin_at timestamp without time zone,
  amount numeric(10,2),
  team_name text,
  emergency_contact text,
  blood_type text,
  medical_condition text,
  distance_name text,
  distance_price numeric(10,2),
  email text,
  full_name text,
  document text,
  payment_id text,
  asaas_payment_id text,
  paid_at timestamp with time zone,
  coupon_code text,
  discount_amount numeric DEFAULT 0,
  base_amount numeric,
  platform_fee numeric DEFAULT 0,
  payment_method text,
  asaas_net_value numeric
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid,
  user_id uuid,
  rating_overall integer,
  rating_organization integer,
  rating_route integer,
  rating_kit integer,
  comment text,
  created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid,
  user_id uuid,
  role text DEFAULT 'member'::text,
  joined_at timestamp without time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  city text,
  logo_url text,
  captain_id uuid,
  created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.termo_aceites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  registration_id uuid,
  user_id uuid,
  event_id uuid,
  nome text,
  cpf text,
  data_nascimento date,
  sexo text,
  distancia text,
  cidade text,
  telefone text,
  email text,
  equipe text,
  ip_hint text,
  aceito_em timestamp without time zone DEFAULT now(),
  termo_versao text DEFAULT 'v1.0'::text
);

CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text NOT NULL,
  role text DEFAULT 'athlete'::text,
  phone text,
  city text,
  avatar_url text,
  created_at timestamp without time zone DEFAULT now(),
  bio text,
  birthdate date,
  cpf text,
  display_email text
);

-- ===== CONSTRAINTS =====
-- Ordem importa: PRIMARY KEY/UNIQUE de TODAS as tabelas primeiro, só depois as
-- FOREIGN KEYs (que dependem de uma unique constraint já existir na tabela
-- referenciada) - descoberto na prática quando "coupons_organizer_id_fkey"
-- falhava porque "users_pkey" ainda não tinha sido criada (ordem alfabética
-- por tabela colocava "users" por último). CHECK por último, sem dependência.
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.coupons ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);
ALTER TABLE public.event_photos ADD CONSTRAINT event_photos_pkey PRIMARY KEY (id);
ALTER TABLE public.events ADD CONSTRAINT events_pkey PRIMARY KEY (id);
ALTER TABLE public.favorites ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);
ALTER TABLE public.leo_conversations ADD CONSTRAINT leo_conversations_pkey PRIMARY KEY (id);
ALTER TABLE public.newsletter ADD CONSTRAINT newsletter_pkey PRIMARY KEY (id);
ALTER TABLE public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE public.registrations ADD CONSTRAINT registrations_pkey PRIMARY KEY (id);
ALTER TABLE public.reviews ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);
ALTER TABLE public.team_members ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);
ALTER TABLE public.teams ADD CONSTRAINT teams_pkey PRIMARY KEY (id);
ALTER TABLE public.termo_aceites ADD CONSTRAINT termo_aceites_pkey PRIMARY KEY (id);
ALTER TABLE public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE public.coupons ADD CONSTRAINT coupons_code_key UNIQUE (code);
ALTER TABLE public.events ADD CONSTRAINT events_slug_key UNIQUE (slug);
ALTER TABLE public.favorites ADD CONSTRAINT favorites_user_id_event_id_key UNIQUE (user_id, event_id);
ALTER TABLE public.newsletter ADD CONSTRAINT newsletter_email_key UNIQUE (email);
-- Nome original, pré-rastreamento - a migration "fix_registration_number_uniqueness"
-- (já rastreada, 20260807025450) troca essa por "registrations_event_id_registration_number_key"
-- (composta com event_id) via DROP CONSTRAINT + ADD CONSTRAINT; sem essa aqui, o DROP falha.
ALTER TABLE public.registrations ADD CONSTRAINT registrations_registration_number_key UNIQUE (registration_number);
ALTER TABLE public.reviews ADD CONSTRAINT reviews_event_id_user_id_key UNIQUE (event_id, user_id);
ALTER TABLE public.team_members ADD CONSTRAINT team_members_team_id_user_id_key UNIQUE (team_id, user_id);
ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE public.coupons ADD CONSTRAINT coupons_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id);
ALTER TABLE public.coupons ADD CONSTRAINT coupons_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES users(id);
ALTER TABLE public.event_photos ADD CONSTRAINT event_photos_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id);
ALTER TABLE public.event_photos ADD CONSTRAINT event_photos_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES users(id);
ALTER TABLE public.events ADD CONSTRAINT events_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES users(id);
ALTER TABLE public.favorites ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE public.favorites ADD CONSTRAINT favorites_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id);
ALTER TABLE public.leo_conversations ADD CONSTRAINT leo_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE public.registrations ADD CONSTRAINT registrations_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id);
ALTER TABLE public.registrations ADD CONSTRAINT registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE public.reviews ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE public.reviews ADD CONSTRAINT reviews_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id);
ALTER TABLE public.team_members ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE public.team_members ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id);
ALTER TABLE public.teams ADD CONSTRAINT teams_captain_id_fkey FOREIGN KEY (captain_id) REFERENCES users(id);
ALTER TABLE public.termo_aceites ADD CONSTRAINT termo_aceites_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE public.termo_aceites ADD CONSTRAINT termo_aceites_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id);
ALTER TABLE public.termo_aceites ADD CONSTRAINT termo_aceites_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES registrations(id);
ALTER TABLE public.coupons ADD CONSTRAINT coupons_discount_type_check CHECK ((discount_type = ANY (ARRAY['percent'::text, 'fixed'::text])));
ALTER TABLE public.events ADD CONSTRAINT events_plan_check CHECK ((plan = ANY (ARRAY['free'::text, 'featured'::text, 'premium'::text])));
ALTER TABLE public.events ADD CONSTRAINT events_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'cancelled'::text])));
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['info'::text, 'success'::text, 'warning'::text, 'error'::text])));
ALTER TABLE public.registrations ADD CONSTRAINT registrations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text, 'paid'::text, 'awaiting_payment'::text, 'presente'::text])));
ALTER TABLE public.reviews ADD CONSTRAINT reviews_rating_organization_check CHECK (((rating_organization >= 1) AND (rating_organization <= 5)));
ALTER TABLE public.reviews ADD CONSTRAINT reviews_rating_kit_check CHECK (((rating_kit >= 1) AND (rating_kit <= 5)));
ALTER TABLE public.reviews ADD CONSTRAINT reviews_rating_overall_check CHECK (((rating_overall >= 1) AND (rating_overall <= 5)));
ALTER TABLE public.reviews ADD CONSTRAINT reviews_rating_route_check CHECK (((rating_route >= 1) AND (rating_route <= 5)));
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'organizer'::text, 'athlete'::text])));

-- ===== INDEXES =====
-- (nenhum índice pré-rastreamento - os 3 que existiam antes eram de
-- registration_types/event_distances, ambas fora dessa baseline)

-- ===== RLS ENABLE =====
-- NOTA: public.users e public.audit_logs ficam de fora de propósito — RLS está
-- desabilitado nelas em produção hoje (ver achado de segurança separado,
-- reportado a parte, não corrigido aqui). Esta baseline replica o estado
-- REAL de produção, bug incluso, porque o objetivo é testar contra a
-- realidade atual, não uma versão idealizada.
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leo_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.termo_aceites ENABLE ROW LEVEL SECURITY;

-- ===== POLICIES =====
CREATE POLICY "Admin exclui coupons" ON public.coupons AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));

-- "Admin visualiza coupons" fica de fora - criada por
-- "bloco85_admin_select_coupons" (já rastreada, sem DROP guard).
CREATE POLICY "Organizadores gerenciam cupons" ON public.coupons AS PERMISSIVE FOR ALL TO public
  USING (((EXISTS ( SELECT 1
   FROM events
  WHERE ((events.id = coupons.event_id) AND (events.organizer_id = auth.uid())))) OR (organizer_id = auth.uid())))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM events
  WHERE ((events.id = coupons.event_id) AND (events.organizer_id = auth.uid())))) OR (organizer_id = auth.uid())));

-- 3 policies de "event_distances" ficam de fora - a tabela inteira é criada por
-- "create_event_distances_table" (já rastreada), políticas inclusas.

CREATE POLICY "Admin exclui fotos" ON public.event_photos AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));

CREATE POLICY "Fotos públicas visíveis" ON public.event_photos AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Organizadores inserem fotos" ON public.event_photos AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM events
  WHERE ((events.id = event_photos.event_id) AND (events.organizer_id = auth.uid())))));

CREATE POLICY "Admin vê todos eventos" ON public.events AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));

CREATE POLICY "Eventos públicos visíveis" ON public.events AS PERMISSIVE FOR SELECT TO public
  USING ((status = 'published'::text));

CREATE POLICY "Organizadores atualizam próprios eventos" ON public.events AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = organizer_id));

CREATE POLICY "Organizadores criam eventos" ON public.events AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = organizer_id));

CREATE POLICY "Organizadores veem próprios eventos" ON public.events AS PERMISSIVE FOR SELECT TO public
  USING (((auth.uid() = organizer_id) OR (status = 'published'::text)));

CREATE POLICY "Admin exclui favoritos" ON public.favorites AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));

CREATE POLICY "Usuários gerenciam favoritos" ON public.favorites AS PERMISSIVE FOR ALL TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Admin acessa tudo" ON public.leo_conversations AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));

CREATE POLICY "Qualquer um pode se cadastrar na newsletter" ON public.newsletter AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Sistema insere notificações" ON public.notifications AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Usuários veem próprias notificações" ON public.notifications AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

-- 3 policies de "registration_types" ficam de fora - a tabela inteira é criada
-- por "registration_types" (já rastreada), políticas inclusas.

CREATE POLICY "Admin vê todas inscrições" ON public.registrations AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));

CREATE POLICY "Organizadores veem inscrições dos seus eventos" ON public.registrations AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM events
  WHERE ((events.id = registrations.event_id) AND (events.organizer_id = auth.uid())))));

CREATE POLICY "Qualquer um pode criar inscricoes" ON public.registrations AS PERMISSIVE FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários veem próprias inscrições" ON public.registrations AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Admin exclui reviews" ON public.reviews AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));

CREATE POLICY "Avaliações públicas" ON public.reviews AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Usuários criam avaliações" ON public.reviews AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Inserir membro" ON public.team_members AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Membros veem próprios times" ON public.team_members AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Capitão gerencia time" ON public.teams AS PERMISSIVE FOR ALL TO public
  USING ((auth.uid() = captain_id));

CREATE POLICY "Times públicos visíveis" ON public.teams AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Admin exclui termo aceites" ON public.termo_aceites AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));

CREATE POLICY "Sistema insere aceites" ON public.termo_aceites AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Usuários veem próprios aceites" ON public.termo_aceites AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Usuários atualizam próprio perfil" ON public.users AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = id));

CREATE POLICY "Usuários autenticados leem perfis" ON public.users AS PERMISSIVE FOR SELECT TO public
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Usuários inserem próprio perfil" ON public.users AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = id));
