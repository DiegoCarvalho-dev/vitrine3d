-- Resumo de visitas do painel (issue #72).
-- Uma função que faz as contas NO BANCO (o painel não traz milhares de
-- eventos para o navegador). Roda com os direitos de quem chama
-- (security invoker): o RLS de eventos/leads/unidades vale, e ainda filtra
-- pelo dono (auth.uid()): o corretor só enxerga os números dos SEUS
-- empreendimentos. Anônimo não executa.
--
-- Devolve um JSON com uma entrada por empreendimento do corretor, no período
-- [p_de, p_ate): visitas (sessões diferentes), quantas caminharam por dentro,
-- cliques no WhatsApp, leads, as 5 unidades mais abertas e os 5 cômodos mais
-- vistos.

create function public.resumo_visitas(p_de timestamptz, p_ate timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with meus as (
    select e.id, e.nome
    from public.empreendimentos e
    where e.dono_id = (select auth.uid())
  ),
  ev as (
    select x.*
    from public.eventos x
    join meus m on m.id = x.empreendimento_id
    where x.criado_em >= p_de and x.criado_em < p_ate
  ),
  vis as (
    select empreendimento_id,
           count(distinct sessao_id)::int as visitas,
           count(distinct sessao_id) filter (where tipo = 'caminhou')::int as caminharam,
           count(*) filter (where tipo = 'clicou_whatsapp')::int as cliques
    from ev
    group by empreendimento_id
  ),
  ld as (
    select l.empreendimento_id, count(*)::int as n
    from public.leads l
    join meus m on m.id = l.empreendimento_id
    where l.criado_em >= p_de and l.criado_em < p_ate
    group by l.empreendimento_id
  ),
  top_unidades as (
    select ev.empreendimento_id, u.numero, count(*)::int as vezes,
           row_number() over (
             partition by ev.empreendimento_id
             order by count(*) desc, u.numero
           ) as rn
    from ev
    join public.unidades u on u.id = ev.unidade_id
    where ev.tipo = 'abriu_unidade'
    group by ev.empreendimento_id, u.numero
  ),
  top_comodos as (
    select ev.empreendimento_id, c.nome, count(*)::int as vezes,
           row_number() over (
             partition by ev.empreendimento_id
             order by count(*) desc, c.nome
           ) as rn
    from ev
    join public.comodos c on c.id = ev.comodo_id
    where ev.tipo = 'viu_comodo'
    group by ev.empreendimento_id, c.nome
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'empreendimento_id', m.id,
      'nome', m.nome,
      'visitas', coalesce(v.visitas, 0),
      'caminharam', coalesce(v.caminharam, 0),
      'cliques_whatsapp', coalesce(v.cliques, 0),
      'leads', coalesce(ld.n, 0),
      'unidades', coalesce((
        select jsonb_agg(jsonb_build_object('numero', t.numero, 'vezes', t.vezes) order by t.rn)
        from top_unidades t where t.empreendimento_id = m.id and t.rn <= 5
      ), '[]'::jsonb),
      'comodos', coalesce((
        select jsonb_agg(jsonb_build_object('nome', t.nome, 'vezes', t.vezes) order by t.rn)
        from top_comodos t where t.empreendimento_id = m.id and t.rn <= 5
      ), '[]'::jsonb)
    ) order by m.nome
  ), '[]'::jsonb)
  from meus m
  left join vis v on v.empreendimento_id = m.id
  left join ld on ld.empreendimento_id = m.id
$$;

-- Liberada de propósito: SÓ o corretor logado executa (o anônimo não).
revoke execute on function public.resumo_visitas(timestamptz, timestamptz)
  from public, anon;
grant execute on function public.resumo_visitas(timestamptz, timestamptz)
  to authenticated;
