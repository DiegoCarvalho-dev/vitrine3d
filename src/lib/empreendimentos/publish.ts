// What a project needs before going live (issue #29). Pure function: the page
// shows the checklist and the Server Action checks it again before publishing.

export type PublishFacts = {
  /** Only buildings have a unit grid; a house is a single property. */
  isBuilding: boolean;
  hasCover: boolean;
  /** Typologies that have at least one room (the floor plan the 3D shows). */
  typologiesWithRooms: number;
  units: number;
  /** Buildings: units match floors × units per floor (none missing/extra). */
  unitGridComplete: boolean;
};

export type PublishRequirement = { label: string; done: boolean };

export function publishChecklist(facts: PublishFacts): PublishRequirement[] {
  return [
    { label: "Foto de capa", done: facts.hasCover },
    {
      label: "Pelo menos 1 tipologia com cômodos",
      done: facts.typologiesWithRooms > 0,
    },
    ...(facts.isBuilding
      ? [
          {
            label: "Unidades geradas",
            done: facts.units > 0 && facts.unitGridComplete,
          },
        ]
      : []),
  ];
}

export function canPublish(facts: PublishFacts): boolean {
  return publishChecklist(facts).every((item) => item.done);
}
