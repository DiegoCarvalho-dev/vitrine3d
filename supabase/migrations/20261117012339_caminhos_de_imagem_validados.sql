-- /code-review do PR #35 (issue #27):
-- 1) A regra do caminho no banco passa a exigir UUIDs completos (8-4-4-4-12),
--    igual à validação do app (src/lib/validacoes/midia.ts).
-- 2) capa_url, avatar_url e logo_url só aceitam caminhos do bucket midias na
--    pasta do próprio dono, mesmo para quem chama a API direto (antes eram
--    texto livre com limite de tamanho).

create or replace function privado.pode_gravar_midia(p_nome text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_nome ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(perfil|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpe?g|png)$'
    and split_part(p_nome, '/', 1) = (select auth.uid())::text
    and (
      split_part(p_nome, '/', 2) = 'perfil'
      or exists (
        select 1
        from public.empreendimentos e
        where e.id::text = split_part(p_nome, '/', 2)
          and e.dono_id = (select auth.uid())
      )
    );
$$;

-- create or replace mantém as permissões, mas reforçamos por clareza.
revoke execute on function privado.pode_gravar_midia(text) from public, anon, authenticated;
grant execute on function privado.pode_gravar_midia(text) to authenticated;

-- Foto e logo: {id-do-corretor}/perfil/{uuid}.ext
alter table public.perfis
  add constraint perfis_avatar_url_caminho check (
    avatar_url is null
    or avatar_url ~ ('^' || id::text || '/perfil/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpe?g|png)$')
  ),
  add constraint perfis_logo_url_caminho check (
    logo_url is null
    or logo_url ~ ('^' || id::text || '/perfil/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpe?g|png)$')
  );

-- Capa: {id-do-dono}/{id-do-empreendimento}/{uuid}.ext (a pasta DESTE empreendimento)
alter table public.empreendimentos
  add constraint empreendimentos_capa_url_caminho check (
    capa_url is null
    or capa_url ~ ('^' || dono_id::text || '/' || id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpe?g|png)$')
  );
