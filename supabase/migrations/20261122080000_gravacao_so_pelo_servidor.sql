-- Só o servidor grava leads e eventos (issue #84).
--
-- Antes: o visitante (papel anon, chave pública que vai no navegador) podia
-- inserir leads e eventos direto na API, pulando a validação do site, o campo
-- isca, o tempo mínimo e os limites. Agora:
--   1) anon não insere mais nada em leads/eventos (as policies de INSERT saem);
--   2) o servidor (service_role, chave secreta, só no servidor) insere, depois
--      da validação Zod, e só nas colunas de dados (nunca status, datas, id);
--   3) uma trava NO BANCO, para qualquer papel: lead/evento só em empreendimento
--      PUBLICADO e cômodo do MESMO empreendimento (antes quem garantia era o
--      RLS do anon; o service_role ignora o RLS, então a regra vira trigger);
--   4) limite por IP guardado no banco (vale para todas as instâncias da
--      Vercel), com um resumo do IP (HMAC feito no servidor), nunca o IP.

-- 1) O visitante não grava mais ----------------------------------------------
drop policy "leads: visitante envia para empreendimento publicado" on public.leads;
drop policy "eventos: visitante registra em empreendimento publicado" on public.eventos;
revoke insert on public.leads from anon;
revoke insert on public.eventos from anon;

-- 2) O servidor grava (só as colunas de dados) --------------------------------
grant insert (empreendimento_id, unidade_id, nome, telefone, email, mensagem, origem, consentimento_lgpd, sessao_id)
  on public.leads to service_role;
grant insert (empreendimento_id, unidade_id, comodo_id, sessao_id, tipo, dados)
  on public.eventos to service_role;
-- A conferência "cômodo do mesmo empreendimento" no servidor lê tipologias.
grant select on public.tipologias to service_role;

-- 3) Trava no banco, para qualquer papel --------------------------------------
create function privado.exigir_empreendimento_publicado()
returns trigger
language plpgsql
volatile
security definer -- lê empreendimentos/cômodos sem depender de quem grava
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.empreendimentos e
    where e.id = new.empreendimento_id and e.status = 'publicado'
  ) then
    raise exception 'Empreendimento não publicado.' using errcode = 'PT403';
  end if;
  if tg_table_name = 'eventos'
     and not privado.comodo_do_empreendimento(new.comodo_id, new.empreendimento_id)
  then
    raise exception 'Cômodo de outro empreendimento.' using errcode = 'PT403';
  end if;
  return new;
end;
$$;

revoke execute on function privado.exigir_empreendimento_publicado()
  from public, anon, authenticated;

create trigger exigir_publicado
  before insert on public.leads
  for each row execute function privado.exigir_empreendimento_publicado();
create trigger exigir_publicado
  before insert on public.eventos
  for each row execute function privado.exigir_empreendimento_publicado();

-- 4) Limite por IP no banco ---------------------------------------------------
create table privado.envios (
  escopo text not null,
  chave text not null,
  criado_em timestamptz not null default now()
);
create index envios_escopo_chave_idx on privado.envios (escopo, chave, criado_em desc);
create index envios_criado_idx on privado.envios (criado_em);

-- Registra um envio e diz se ele cabe no limite (true) ou não (false).
-- p_chave é um HMAC do IP feito no servidor (hex), nunca o IP em si.
create function public.registrar_envio(
  p_escopo text,
  p_chave text,
  p_limite int,
  p_janela_segundos int
)
returns boolean
language plpgsql
volatile
security definer -- grava em privado.envios (fora da API)
set search_path = ''
as $$
begin
  if p_escopo !~ '^[a-z_]{1,20}$' or p_chave !~ '^[a-f0-9]{16,64}$'
     or p_limite < 1 or p_janela_segundos < 1 or p_janela_segundos > 86400 then
    return false;
  end if;
  -- Dois envios ao mesmo tempo da mesma chave não passam juntos do limite.
  perform pg_advisory_xact_lock(hashtext(p_escopo || ':' || p_chave));
  if (
    select count(*) from privado.envios v
    where v.escopo = p_escopo and v.chave = p_chave
      and v.criado_em > now() - make_interval(secs => p_janela_segundos)
  ) >= p_limite then
    return false;
  end if;
  insert into privado.envios (escopo, chave) values (p_escopo, p_chave);
  -- Faxina de vez em quando (1% das chamadas): nada fica mais de 1 dia.
  if random() < 0.01 then
    delete from privado.envios where criado_em < now() - interval '1 day';
  end if;
  return true;
end;
$$;

-- Só o servidor chama.
revoke execute on function public.registrar_envio(text, text, int, int)
  from public, anon, authenticated;
grant execute on function public.registrar_envio(text, text, int, int)
  to service_role;
