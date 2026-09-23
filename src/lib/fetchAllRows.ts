// O PostgREST do Supabase devolve no máximo 1.000 linhas por consulta, em silêncio (sem erro).
// Em 23/09/2026 a base passou de 1.000 inscrições/usuários e o painel Admin passou a ignorar
// as 36 inscrições mais antigas da Arena MMP (líquido exibido R$10.461,15 vs real R$12.369,15).
// Toda leitura de tabela que pode crescer (registrations, users) deve passar por aqui.
//
// `build` deve devolver uma consulta NOVA a cada chamada (com filtros/ordem próprios); o helper
// acrescenta `id` como desempate da ordenação, pagina com .range() e remove duplicatas por id
// (uma inscrição nova entrando no meio da paginação desloca o offset).
const PAGE_SIZE = 1000;

export async function fetchAllRows<T extends { id?: string } = any>(
  build: () => any,
): Promise<{ data: T[]; error: { message: string } | null }> {
  const rows: T[] = [];
  const seen = new Set<string>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build().order('id').range(from, from + PAGE_SIZE - 1);
    if (error) return { data: rows, error };
    for (const r of (data || []) as T[]) {
      if (r.id != null) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
      }
      rows.push(r);
    }
    if (!data || data.length < PAGE_SIZE) return { data: rows, error: null };
  }
}
