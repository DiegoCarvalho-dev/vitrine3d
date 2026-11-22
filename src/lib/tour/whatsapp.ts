// WhatsApp button of the public tour (issue #68): a link that opens the
// broker's WhatsApp with the message already written. Pure functions.

/** The broker's number in E.164 (+5511999999999), as saved in the profile. */
const E164 = /^\+[1-9]\d{7,14}$/;

/**
 * The message the visitor sends. With a unit: "…me interessei pela unidade
 * 902"; without: about the project. The project and unit names come from the
 * database (typed by the broker) and are only ever put in a URL-encoded text.
 */
export function whatsappMessage(
  projectName: string,
  unitNumber?: string | null,
): string {
  const name = projectName.replace(/\s+/g, " ").trim().slice(0, 80);
  const unit = unitNumber?.replace(/\s+/g, " ").trim().slice(0, 10);
  return unit
    ? `Olá! Vi o ${name} no tour 3D e me interessei pela unidade ${unit}. Pode me passar mais informações?`
    : `Olá! Vi o ${name} no tour 3D. Pode me passar mais informações?`;
}

/**
 * `https://wa.me/<number>?text=…`, or null when the broker has no valid
 * WhatsApp (then the button doesn't show).
 */
export function whatsappLink(
  e164: string | null | undefined,
  message: string,
): string | null {
  if (!e164 || !E164.test(e164)) return null;
  // wa.me wants digits only, no "+".
  return `https://wa.me/${e164.slice(1)}?text=${encodeURIComponent(message)}`;
}
