export const ROLES = [
  { id: "townsfolk", label: "Townsfolk", color: "var(--c-townsfolk)" },
  { id: "outsider", label: "Outsider", color: "var(--c-outsider)" },
  { id: "minion", label: "Minion", color: "var(--c-minion)" },
  { id: "demon", label: "Demon", color: "var(--c-demon)" },
  { id: "traveller", label: "Traveller", color: "var(--c-traveller)" },
  { id: "fabled", label: "Fabled", color: "var(--c-fabled)" },
  { id: "loric", label: "Loric", color: "var(--c-loric)" },
  { id: "unknown", label: "Other", color: "var(--bone)" },
];

export const roleById = Object.fromEntries(
  ROLES.map((role) => [role.id, role]),
);
export const roleIds = ROLES.map((role) => role.id);

export function getRole(id) {
  return roleById[id] || roleById.unknown;
}
