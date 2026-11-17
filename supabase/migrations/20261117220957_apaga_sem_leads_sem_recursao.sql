-- Corrige a migration anterior: a política de DELETE consultava leads, cujo
-- RLS consulta empreendimentos de volta -> "infinite recursion" (42P17).
-- A checagem passa para uma função SECURITY DEFINER no schema privado (fora
-- da API), que lê leads sem disparar o RLS. Ela só diz se o empreendimento
-- tem algum lead; a política continua exigindo que quem apaga seja o dono.

create function privado.empreendimento_tem_leads(p_empreendimento uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.leads l where l.empreendimento_id = p_empreendimento
  );
$$;

revoke execute on function privado.empreendimento_tem_leads(uuid) from public, anon, authenticated;
grant execute on function privado.empreendimento_tem_leads(uuid) to authenticated;

drop policy "empreendimentos: dono apaga os sem leads" on public.empreendimentos;

create policy "empreendimentos: dono apaga os sem leads"
  on public.empreendimentos
  for delete
  to authenticated
  using (
    (select auth.uid()) = dono_id
    and not privado.empreendimento_tem_leads(id)
  );
