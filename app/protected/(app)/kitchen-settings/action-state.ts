export type KitchenSettingsActionState = {
  status: "idle" | "success" | "error";
  error?: string;
};

export const defaultKitchenSettingsState: KitchenSettingsActionState = {
  status: "idle",
};
