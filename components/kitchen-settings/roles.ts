export const ROLE_OPTIONS = ["owner", "member"] as const;
export type KitchenRole = (typeof ROLE_OPTIONS)[number];
