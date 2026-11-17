-- Sprint 3, issue #27: bucket de mídias (capa, foto e logo do corretor).
--
-- Caminho dos arquivos (a regra de acesso):
--   {id-do-corretor}/{id-de-um-empreendimento-dele | perfil}/{uuid}.webp|.jpg|.jpeg|.png
-- - escrita (enviar, substituir, apagar) só pelo dono, só nesse formato;
-- - bucket PÚBLICO: quem tem a URL exata baixa o arquivo (o tour e a prévia do
--   WhatsApp precisam disso). Nomes de arquivo são UUIDs aleatórios, então
--   imagens de rascunho não são adivinháveis. Listar arquivos pela API: só o dono.
-- - limite de 2 MB e só imagens (conferido pelo Storage, além do navegador).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('midias', 'midias', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- O caminho é válido e pertence ao usuário logado?
-- SECURITY INVOKER: respeita o RLS de empreendimentos (só vê os próprios ou publicados,
-- e a checagem exige dono_id = usuário).
create function privado.pode_gravar_midia(p_nome text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_nome ~ '^[0-9a-f-]{36}/(perfil|[0-9a-f-]{36})/[0-9a-f-]{36}\.(webp|jpe?g|png)$'
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

revoke execute on function privado.pode_gravar_midia(text) from public, anon, authenticated;
grant execute on function privado.pode_gravar_midia(text) to authenticated;

-- Policies em storage.objects (só para o bucket midias).
create policy "midias: dono envia no próprio caminho"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'midias' and privado.pode_gravar_midia(name));

-- SELECT do dono: necessário para substituir (upsert) e para listar os próprios arquivos.
create policy "midias: dono lista os próprios arquivos"
  on storage.objects for select to authenticated
  using (bucket_id = 'midias' and split_part(name, '/', 1) = (select auth.uid())::text);

create policy "midias: dono substitui no próprio caminho"
  on storage.objects for update to authenticated
  using (bucket_id = 'midias' and split_part(name, '/', 1) = (select auth.uid())::text)
  with check (bucket_id = 'midias' and privado.pode_gravar_midia(name));

create policy "midias: dono apaga os próprios arquivos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'midias' and split_part(name, '/', 1) = (select auth.uid())::text);
