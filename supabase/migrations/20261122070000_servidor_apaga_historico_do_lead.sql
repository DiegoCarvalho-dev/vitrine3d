-- Apagar um lead a pedido do cliente (LGPD, issue #71) também apaga o
-- histórico de visitas dele (eventos da mesma sessão). Os eventos são
-- imutáveis pela API (ninguém apaga), então quem apaga é o SERVIDOR, com a
-- chave secreta, e só depois de o RLS provar que o corretor é dono do lead.
-- Fica só DELETE em eventos para o service_role (já tinha SELECT).

grant delete on table public.eventos to service_role;
