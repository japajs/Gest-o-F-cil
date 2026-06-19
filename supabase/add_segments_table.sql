-- Tabela de segmentos de empresa (gerenciável pela interface)
create table if not exists segments (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique,
  created_at timestamptz not null default now()
);

alter table segments enable row level security;

-- Todos autenticados podem ler
create policy "segments_select" on segments
  for select to authenticated using (true);

-- Somente admin pode inserir/atualizar/excluir
create policy "segments_insert" on segments
  for insert to authenticated
  with check ((select role from profiles where id = auth.uid()) = 'admin');

create policy "segments_delete" on segments
  for delete to authenticated
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- Seed: segmentos padrão (ignora duplicatas)
insert into segments (name) values
  ('Barbearia'),
  ('Clínica'),
  ('Loja'),
  ('Manicure'),
  ('Pedicure'),
  ('Prestador de serviço'),
  ('Restaurante'),
  ('Salão'),
  ('Outro')
on conflict (name) do nothing;
