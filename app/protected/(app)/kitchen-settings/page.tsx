import { resolveKitchen } from "@/app/protected/_lib/resolve-kitchen";
import { deriveLocationPlannerState } from "@/app/protected/_lib/location-presets";

import { KitchenSettingsForm } from "./kitchen-settings-form";

export default async function KitchenSettingsPage() {
  const kitchenSnapshot = await resolveKitchen();
  const {
    kitchen: { id, name, memberCount, locations, members, iconKey },
    pendingInvites,
    user,
  } = kitchenSnapshot;

  const { defaultOptions, initialCustomLocations } = deriveLocationPlannerState(locations);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Kitchen settings</h1>
        <p className="text-sm text-muted-foreground">
          Update how your shared kitchen shows up across KitchenSync and fine-tune the storage areas you manage
          day to day. Everyone in the workspace sees these changes immediately.
        </p>
      </div>

      <KitchenSettingsForm
        kitchenId={id}
        initialKitchenName={name}
        initialKitchenIconKey={iconKey}
        memberCount={memberCount}
        defaultOptions={defaultOptions}
        initialCustomLocations={initialCustomLocations}
        members={members ?? []}
        pendingInvites={pendingInvites}
        currentUserId={user.id}
      />
    </div>
  );
}
