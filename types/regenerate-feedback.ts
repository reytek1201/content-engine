export const REGENERATE_FEEDBACK_CHIPS = [
  {
    id: "brighter",
    label: "Brighter",
    prompt:
      "Use a brighter, more airy palette with stronger overall luminosity.",
  },
  {
    id: "minimal",
    label: "Minimal",
    prompt:
      "Use a cleaner, more minimal layout with more negative space and less clutter.",
  },
  {
    id: "bold_colors",
    label: "Bold colors",
    prompt:
      "Use bolder, more saturated colors and stronger visual contrast.",
  },
  {
    id: "product_larger",
    label: "Product larger",
    prompt:
      "Make the hero product or subject significantly larger and more prominent in the frame.",
  },
  {
    id: "different_layout",
    label: "Different layout",
    prompt:
      "Use a noticeably different composition and layout from the previous attempt.",
  },
  {
    id: "try_again",
    label: "Try again",
    prompt:
      "Create a clearly different visual variation with alternative composition, color treatment, and layout while preserving the headline and campaign message.",
  },
] as const;

export type RegenerateFeedbackChipId =
  (typeof REGENERATE_FEEDBACK_CHIPS)[number]["id"];

export const REGENERATE_FEEDBACK_CHIP_IDS = REGENERATE_FEEDBACK_CHIPS.map(
  (chip) => chip.id
) as [RegenerateFeedbackChipId, ...RegenerateFeedbackChipId[]];

const chipPromptById = Object.fromEntries(
  REGENERATE_FEEDBACK_CHIPS.map((chip) => [chip.id, chip.prompt])
) as Record<RegenerateFeedbackChipId, string>;

export function resolveRegenerationFeedback(
  chipIds: RegenerateFeedbackChipId[],
  customNotes?: string
): string {
  const prompts = chipIds.map((id) => chipPromptById[id]).filter(Boolean);

  const trimmedNotes = customNotes?.trim();

  if (trimmedNotes) {
    prompts.push(trimmedNotes);
  }

  return prompts.join(" ");
}
