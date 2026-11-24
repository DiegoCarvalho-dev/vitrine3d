-- Salva a planta inteira de uma tipologia de uma vez (issue #105, editor visual).
--
-- O editor manda a lista completa de cômodos: os que têm id são atualizados,
-- os sem id são criados e os que sumiram da lista são apagados. Tudo numa
-- transação só: se qualquer passo falhar, nada muda (a planta nunca fica pela
-- metade).
--
-- SECURITY INVOKER: roda com o papel de quem chama (o corretor logado), então
-- as policies de comodos ("dono cria/edita/apaga") continuam decidindo. A
-- validação dos dados (Zod, sobreposição) é feita antes, no servidor; aqui o
-- banco só confere que a tipologia é de um empreendimento do próprio corretor.

create function public.salvar_comodos(p_tipologia_id uuid, p_comodos jsonb)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  item jsonb;
  posicao int := 0;
  mantidos uuid[] := '{}';
  novo_id uuid;
begin
  if jsonb_typeof(p_comodos) is distinct from 'array'
     or jsonb_array_length(p_comodos) > 60 then
    raise exception 'Lista de cômodos inválida.' using errcode = '22023';
  end if;

  -- Só a tipologia de um empreendimento do próprio corretor.
  if not exists (
    select 1
    from public.tipologias t
    join public.empreendimentos e on e.id = t.empreendimento_id
    where t.id = p_tipologia_id and e.dono_id = (select auth.uid())
  ) then
    raise exception 'Tipologia não encontrada.' using errcode = '42501';
  end if;

  for item in select value from jsonb_array_elements(p_comodos) loop
    if item ? 'id' and item->>'id' is not null then
      update public.comodos set
        nome = item->>'nome',
        tipo = (item->>'tipo')::public.tipo_comodo,
        descricao = item->>'descricao',
        geometria = item->'geometria',
        area_m2 = (item->>'area_m2')::numeric,
        ordem = posicao
      where id = (item->>'id')::uuid and tipologia_id = p_tipologia_id
      returning id into novo_id;
      if novo_id is null then
        raise exception 'Cômodo não encontrado.' using errcode = '42501';
      end if;
    else
      insert into public.comodos (tipologia_id, nome, tipo, descricao, geometria, area_m2, ordem)
      values (
        p_tipologia_id,
        item->>'nome',
        (item->>'tipo')::public.tipo_comodo,
        item->>'descricao',
        item->'geometria',
        (item->>'area_m2')::numeric,
        posicao
      )
      returning id into novo_id;
    end if;
    mantidos := mantidos || novo_id;
    novo_id := null;
    posicao := posicao + 1;
  end loop;

  -- O que saiu da planta é apagado (pontos de interesse ligados vão junto).
  delete from public.comodos
  where tipologia_id = p_tipologia_id and id <> all (mantidos);
end;
$$;

-- Só o corretor logado chama (nunca o visitante anônimo).
revoke execute on function public.salvar_comodos(uuid, jsonb) from public, anon;
grant execute on function public.salvar_comodos(uuid, jsonb) to authenticated;
