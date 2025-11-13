"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { LocationPlanner } from "@/components/onboarding/location-planner";
import { MembersCard } from "@/components/kitchen-settings/members-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/supabase/utils";
import {
  defaultKitchenIconId,
  isKitchenIconId,
  kitchenIconOptions,
  type KitchenIconId,
} from "@/components/navigation/kitchen-icons";

import type {
  CustomPlannerLocation,
  DefaultLocationOption,
} from "@/app/protected/_lib/location-presets";
import type { KitchenInviteSummary, KitchenMember } from "@/lib/domain/kitchen";
import { renameKitchen, updateKitchenSettings } from "./actions";
import type { KitchenSettingsActionState } from "./action-state";
import { defaultKitchenSettingsState } from "./action-state";

type KitchenSettingsFormProps = {
  kitchenId: string;
  initialKitchenName: string;
  initialKitchenIconKey: string | null;
  memberCount: number | null;
  defaultOptions: DefaultLocationOption[];
  initialCustomLocations: CustomPlannerLocation[];
  members: KitchenMember[];
  pendingInvites: KitchenInviteSummary[];
  currentUserId: string;
};

type LocationSummary = {
  total: number;
  defaults: number;
  customs: number;
};

function CardSubmitButton({ disabled, label }: { disabled?: boolean; label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      className="bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400"
    >
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function KitchenSettingsForm({
  kitchenId,
  initialKitchenName,
  initialKitchenIconKey,
  memberCount,
  defaultOptions,
  initialCustomLocations,
  members,
  pendingInvites,
  currentUserId,
}: KitchenSettingsFormProps) {
  const sanitizedIconKey = isKitchenIconId(initialKitchenIconKey)
    ? initialKitchenIconKey
    : defaultKitchenIconId;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,0.35fr)]">
      <div className="space-y-8">
        <KitchenIdentityCard
          kitchenId={kitchenId}
          initialKitchenName={initialKitchenName}
          initialKitchenIconKey={sanitizedIconKey}
        />
        <StorageLocationsCard
          kitchenId={kitchenId}
          defaultOptions={defaultOptions}
          initialCustomLocations={initialCustomLocations}
        />
      </div>
      <div className="space-y-8">
        <MembersCard
          kitchenId={kitchenId}
          members={members}
          pendingInvites={pendingInvites}
          currentUserId={currentUserId}
          memberCount={memberCount ?? members.length}
        />
      </div>
    </div>
  );
}

function KitchenIdentityCard({
  kitchenId,
  initialKitchenName,
  initialKitchenIconKey,
}: {
  kitchenId: string;
  initialKitchenName: string;
  initialKitchenIconKey: KitchenIconId;
}) {
  const [name, setName] = useState(initialKitchenName);
  const [iconKey, setIconKey] = useState<KitchenIconId>(initialKitchenIconKey);
  const [state, formAction] = useActionState<KitchenSettingsActionState, FormData>(
    renameKitchen,
    defaultKitchenSettingsState,
  );
  const lastHandledStatus = useRef<"idle" | "success" | "error">("idle");
  const activeOption =
    kitchenIconOptions.find((option) => option.id === iconKey) ?? kitchenIconOptions[0];
  const ActiveIcon = activeOption.icon;
  const trimmedName = name.trim();
  const nothingChanged = trimmedName === initialKitchenName.trim() && iconKey === initialKitchenIconKey;
  const disableSave = trimmedName.length === 0 || nothingChanged;

  useEffect(() => {
    if (state.status === "success" && lastHandledStatus.current !== "success") {
      toast.success("Kitchen identity updated", {
        description: "Everyone will see the new icon and name right away.",
      });
    } else if (state.status === "error" && lastHandledStatus.current !== "error") {
      toast.error("Couldn’t update kitchen name", {
        description: state.error ?? "Try again shortly.",
      });
    }
    lastHandledStatus.current = state.status;
  }, [state.status, state.error]);

  return (
    <Card className="shadow-sm">
      <form action={formAction}>
        <CardHeader className="space-y-1">
          <CardTitle>Kitchen identity</CardTitle>
          <CardDescription>
            Choose a name your members will instantly recognize and pair it with an icon that shows up in the
            sidebar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <input type="hidden" name="kitchenId" value={kitchenId} />
          <input type="hidden" name="iconKey" value={iconKey} />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)]">
            <div className="flex flex-col items-center gap-4 rounded-2xl bg-background p-6 text-center">
              <div className="flex size-24 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <ActiveIcon className="size-10" />
              </div>
              <KitchenIconSelector value={iconKey} onChange={setIconKey} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kitchenName-input">Kitchen name</Label>
              <Input
                id="kitchenName-input"
                name="kitchenName"
                value={name}
                onChange={(event) => setName(event.target.value.slice(0, 120))}
                placeholder="The Swartz Kitchen"
                maxLength={120}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            disabled={nothingChanged}
            onClick={() => {
              setName(initialKitchenName);
              setIconKey(initialKitchenIconKey);
            }}
          >
            Reset
          </Button>
          <CardSubmitButton label="Save name" disabled={disableSave} />
        </CardFooter>
      </form>
    </Card>
  );
}

type KitchenIconSelectorProps = {
  value: KitchenIconId;
  onChange: (value: KitchenIconId) => void;
};

function KitchenIconSelector({ value, onChange }: KitchenIconSelectorProps) {
  const [open, setOpen] = useState(false);
  const [pendingIcon, setPendingIcon] = useState<KitchenIconId>(value);

  useEffect(() => {
    if (!open) {
      setPendingIcon(value);
    }
  }, [open, value]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Choose icon
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Choose a kitchen icon</DialogTitle>
          <DialogDescription>Pick an icon to represent this kitchen across the app.</DialogDescription>
        </DialogHeader>
            <div className="rounded-xl border bg-muted/30 p-4">
              <div
                className="grid max-h-72 grid-cols-[repeat(auto-fit,minmax(3rem,1fr))] gap-2 overflow-y-auto"
                role="listbox"
                aria-label="Kitchen icon options"
              >
                {kitchenIconOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = option.id === pendingIcon;
                  return (
                    <button
                  type="button"
                  key={option.id}
                  role="option"
                  aria-selected={isActive}
                      onClick={() => setPendingIcon(option.id)}
                      className={cn(
                        "flex h-12 w-full items-center justify-center rounded-lg transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                        isActive
                          ? "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  <Icon className="size-7" strokeWidth={2} />
                  <span className="sr-only">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setOpen(false);
              setPendingIcon(value);
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onChange(pendingIcon);
              setOpen(false);
            }}
          >
            Use icon
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StorageLocationsCard({
  kitchenId,
  defaultOptions,
  initialCustomLocations,
}: {
  kitchenId: string;
  defaultOptions: DefaultLocationOption[];
  initialCustomLocations: CustomPlannerLocation[];
}) {
  const [state, formAction] = useActionState<KitchenSettingsActionState, FormData>(
    updateKitchenSettings,
    defaultKitchenSettingsState,
  );
  const [locationSummary, setLocationSummary] = useState<LocationSummary>(() => {
    const defaultCount = defaultOptions.filter((option) => option.selected).length;
    return {
      defaults: defaultCount,
      customs: initialCustomLocations.length,
      total: defaultCount + initialCustomLocations.length,
    };
  });
  const lastHandledStatus = useRef<"idle" | "success" | "error">("idle");

  const handleLocationSummaryChange = useCallback((summary: LocationSummary) => {
    setLocationSummary((previous) => {
      if (
        previous.total === summary.total &&
        previous.defaults === summary.defaults &&
        previous.customs === summary.customs
      ) {
        return previous;
      }
      return summary;
    });
  }, []);

  useEffect(() => {
    if (state.status === "success" && lastHandledStatus.current !== "success") {
      toast.success("Storage locations saved");
    } else if (state.status === "error" && lastHandledStatus.current !== "error") {
      toast.error("Couldn’t save locations", {
        description: state.error ?? "Try again shortly.",
      });
    }
    lastHandledStatus.current = state.status;
  }, [state.status, state.error]);

  const disableSubmit = locationSummary.total === 0;

  return (
    <Card
      className={cn(
        "shadow-sm transition-colors",
        locationSummary.total === 0 && "border-red-400 dark:border-red-500",
      )}
    >
      <form action={formAction}>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Tracked storage locations</CardTitle>
            <CardDescription>
              Align on which areas KitchenSync monitors. Add personalized zones or prune old ones anytime.
            </CardDescription>
          </div>
          <div
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
              locationSummary.total === 0
                ? "border-red-400 bg-red-500/10 text-red-600 dark:border-red-500 dark:bg-red-500/15 dark:text-red-200"
                : "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200",
            )}
          >
            {locationSummary.total === 0
              ? "None selected"
              : `${locationSummary.total} selected (${locationSummary.defaults} starter, ${locationSummary.customs} custom)`}
          </div>
        </CardHeader>
        <CardContent>
          <input type="hidden" name="kitchenId" value={kitchenId} />
          <LocationPlanner
            defaultOptions={defaultOptions}
            initialCustomLocations={initialCustomLocations}
            onSelectionChange={handleLocationSummaryChange}
          />
        </CardContent>
        <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Pick at least one storage area so inventory items have a home from day one.
          </p>
          <CardSubmitButton label="Save storage plan" disabled={disableSubmit} />
        </CardFooter>
      </form>
    </Card>
  );
}
