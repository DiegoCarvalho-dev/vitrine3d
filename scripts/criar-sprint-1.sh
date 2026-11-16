#!/usr/bin/env bash
# Cria labels, a milestone da Sprint 1 e as issues a partir de docs/sprints/sprint-1/*.md
# Uso (na raiz do repositório, com `gh auth login` feito):  bash scripts/criar-sprint-1.sh
# Usa só a API REST do GitHub (gh api) e pode ser executado mais de uma vez sem duplicar.
set -euo pipefail

REPO="repos/{owner}/{repo}"
MILESTONE="Sprint 1 – Ambiente"
DIR="docs/sprints/sprint-1"

echo "→ Labels..."
existentes=$(gh api "$REPO/labels?per_page=100" --paginate --jq '.[].name')
while IFS='|' read -r nome cor desc; do
  if grep -qxF "$nome" <<<"$existentes"; then
    echo "   (já existe) $nome"
  else
    gh api "$REPO/labels" -f name="$nome" -f color="$cor" -f description="$desc" >/dev/null
    echo "   ✓ $nome"
  fi
done <<'LABELS'
tipo:feature|1D76DB|Nova funcionalidade
tipo:bug|D73A4A|Algo não funciona
tipo:chore|C5DEF5|Configuração, infraestrutura, manutenção
tipo:docs|0075CA|Documentação
tipo:estudo|BFD4F2|Tempo reservado para estudo
area:3d|7057FF|Cenas e componentes 3D
area:painel|FBCA04|Painel do corretor
area:tour|0E8A16|Tour público
area:banco|5319E7|Banco de dados, migrations, RLS
area:infra|BFDADC|Ambiente, deploy, CI
prioridade:alta|B60205|Fazer primeiro
seguranca|E99695|Exige /security-review
LABELS

echo "→ Milestone..."
num=$(gh api "$REPO/milestones?state=all&per_page=100" --jq ".[] | select(.title==\"$MILESTONE\") | .number")
if [ -z "$num" ]; then
  num=$(gh api "$REPO/milestones" -f title="$MILESTONE" \
    -f description="Preparar o ambiente local, repositório, Supabase, Vercel e a prova de conceito 3D." --jq .number)
fi
echo "   $MILESTONE (#$num)"

echo "→ Issues..."
titulos=$(gh api "$REPO/issues?state=all&per_page=100" --paginate --jq '.[].title')
for f in "$DIR"/*.md; do
  titulo=$(sed -n 's/^title: "\(.*\)"$/\1/p' "$f" | head -1)
  labels=$(sed -n 's/^labels: "\(.*\)"$/\1/p' "$f" | head -1)
  if grep -qxF "$titulo" <<<"$titulos"; then
    echo "   (já existe) $titulo"; continue
  fi
  corpo=$(awk 'BEGIN{n=0} /^---$/{n++; next} n>=2' "$f")
  args=()
  IFS=',' read -ra ls <<<"$labels"
  for l in "${ls[@]}"; do args+=(-f "labels[]=$l"); done
  n=$(gh api "$REPO/issues" -f title="$titulo" -f body="$corpo" -F milestone="$num" "${args[@]}" --jq .number)
  echo "   ✓ #$n $titulo"
done
echo "Pronto."
