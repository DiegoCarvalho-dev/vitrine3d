/**
 * Transforma um texto em slug para URL: minúsculas, sem acentos, só a-z, 0-9 e hífen.
 * Ex.: "Residencial Águas Claras – Torre 2" → "residencial-aguas-claras-torre-2"
 *
 * Usado na URL pública do empreendimento (/e/[slug]); ver docs/03-modelagem-de-dados.md.
 */
export function slugify(text: string): string {
  return text
    .normalize("NFD") // separa a letra do acento: "á" → "a" + "´"
    .replace(/[̀-ͯ]/g, "") // remove os acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // qualquer outra coisa vira hífen
    .replace(/^-+|-+$/g, ""); // tira hífens do começo e do fim
}
