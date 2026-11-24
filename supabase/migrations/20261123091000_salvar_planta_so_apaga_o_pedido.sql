-- Revisão da issue #105: salvar a planta apaga SÓ os cômodos pedidos.
--
-- Antes, todo cômodo fora da lista era apagado. Isso apagava, sem aviso,
-- cômodos que o editor nunca mostrou (formato inválido, dados antigos) ou que
-- foram criados em outra aba depois que a página abriu. Agora o editor manda
-- a lista do que mudou (p_comodos) e a lista do que a pessoa tirou
-- (p_remover); o resto fica como está.
--
-- Também já recebe a planta extra da tipologia (portas e janelas, issue #106)
-- para salvar tudo na mesma transação. Sem p_planta, a planta extra não muda.

drop function public.salvar_comodos(uuid, jsonb);

create function public.salvar_comodos(
  p_tipologia_id uuid,
  p_comodos jsonb,
  p_remover uuid[] default '{}',
  p_planta jsonb default null
)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  item jsonb;
  posicao int := 0;
  achou uuid;
begin
  if jsonb_typeof(p_comodos) is distinct from 'array'
     or jsonb_array_length(p_comodos) > 60
     or coalesce(array_length(p_remover, 1), 0) > 60 then
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

  -- Primeiro o que saiu (libera o espaço), depois o que ficou ou entrou.
  if coalesce(array_length(p_remover, 1), 0) > 0 then
    delete from public.comodos
    where tipologia_id = p_tipologia_id and id = any (p_remover);
  end if;

  for item in select value from jsonb_array_elements(p_comodos) loop
    achou := null;
    if item->>'id' is not null then
      update public.comodos set
        nome = item->>'nome',
        tipo = (item->>'tipo')::public.tipo_comodo,
        descricao = item->>'descricao',
        geometria = item->'geometria',
        area_m2 = (item->>'area_m2')::numeric,
        ordem = posicao
      where id = (item->>'id')::uuid and tipologia_id = p_tipologia_id
      returning id into achou;
      if achou is null then
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
      );
    end if;
    posicao := posicao + 1;
  end loop;

  if p_planta is not null then
    update public.tipologias set planta = p_planta where id = p_tipologia_id;
  end if;
end;
$$;

-- Só o corretor logado chama (nunca o visitante anônimo).
revoke execute on function public.salvar_comodos(uuid, jsonb, uuid[], jsonb) from public, anon;
grant execute on function public.salvar_comodos(uuid, jsonb, uuid[], jsonb) to authenticated;
