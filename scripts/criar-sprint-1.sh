#!/usr/bin/env bash
# Cria labels, a milestone da Sprint 1 e as issues a partir de docs/sprints/sprint-1/*.md
# Uso (na raiz do repositório, com `gh auth login` feito):  bash scripts/criar-sprint-1.sh
set -euo pipefail

MILESTONE="Sprint 1 – Ambiente"
DIR="docs/sprints/sprint-1"

echo "→ Criando labels..."
while IFS='|' read -r nome cor desc; do
  gh label create "$nome" --color "$cor" --description "$desc" --force >/dev/null
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

echo "→ Criando milestone..."
if ! gh api "repos/{owner}/{repo}/milestones?state=all" --jq '.[].title' | grep -qx "$MILESTONE"; then
  gh api "repos/{owner}/{repo}/milestones" -f title="$MILESTONE" \
    -f description="Preparar o ambiente local, repositório, Supabase, Vercel e a prova de conceito 3D." >/dev/null
fi

echo "→ Criando issues..."
for f in "$DIR"/*.md; do
  titulo=$(sed -n 's/^title: "\(.*\)"$/\1/p' "$f" | head -1)
  labels=$(sed -n 's/^labels: "\(.*\)"$/\1/p' "$f" | head -1)
  if gh issue list --state all --search "in:title \"$titulo\"" --json title --jq '.[].title' | grep -qxF "$titulo"; then
    echo "   (já existe) $titulo"; continue
  fi
  corpo=$(awk 'BEGIN{n=0} /^---$/{n++; next} n>=2' "$f")
  gh issue create --title "$titulo" --body "$corpo" --label "$labels" --milestone "$MILESTONE" >/dev/null
  echo "   ✓ $titulo"
done
echo "Pronto."
