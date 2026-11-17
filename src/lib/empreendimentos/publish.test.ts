import { describe, expect, it } from "vitest";

import { canPublish, publishChecklist } from "./publish";

const complete = {
  isBuilding: true,
  hasCover: true,
  typologiesWithRooms: 1,
  units: 40,
};

describe("publishChecklist", () => {
  it("com tudo pronto, pode publicar", () => {
    expect(canPublish(complete)).toBe(true);
    expect(publishChecklist(complete).every((i) => i.done)).toBe(true);
  });

  it("empreendimento recém-criado: lista os 3 itens que faltam", () => {
    const facts = {
      isBuilding: true,
      hasCover: false,
      typologiesWithRooms: 0,
      units: 0,
    };
    expect(canPublish(facts)).toBe(false);
    expect(
      publishChecklist(facts)
        .filter((i) => !i.done)
        .map((i) => i.label),
    ).toEqual([
      "Foto de capa",
      "Pelo menos 1 tipologia com cômodos",
      "Unidades geradas",
    ]);
  });

  it.each([
    [{ ...complete, hasCover: false }, "Foto de capa"],
    [
      { ...complete, typologiesWithRooms: 0 },
      "Pelo menos 1 tipologia com cômodos",
    ],
    [{ ...complete, units: 0 }, "Unidades geradas"],
  ])("falta só um item: %j", (facts, missing) => {
    expect(canPublish(facts)).toBe(false);
    expect(
      publishChecklist(facts)
        .filter((i) => !i.done)
        .map((i) => i.label),
    ).toEqual([missing]);
  });

  it("casa não tem grade de unidades: não exige unidades geradas", () => {
    const house = { ...complete, isBuilding: false, units: 0 };
    expect(canPublish(house)).toBe(true);
    expect(publishChecklist(house).map((i) => i.label)).not.toContain(
      "Unidades geradas",
    );
  });
});
