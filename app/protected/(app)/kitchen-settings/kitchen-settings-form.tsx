"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { LocationPlanner } from "@/components/onboarding/location-planner";
import { MembersCard } from "@/components/kitchen-settings/members-card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

import {
  normalizeLocationName,
  type CustomPlannerLocation,
  type DefaultLocationOption,
} from "@/app/protected/_lib/location-presets";
import type { KitchenInviteSummary, KitchenMember, LocationSummary } from "@/lib/domain/kitchen";
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
  locations: LocationSummary[];
  members: KitchenMember[];
  pendingInvites: KitchenInviteSummary[];
  currentUserId: string;
};

type LocationSummary = {
  total: number;
  defaults: number;
  customs: number;
};

type PlannerSelection = {
  name: string;
  icon: string | null;
  source: "default" | "custom";
};

function summarizeInitialLocations(
  defaultOptions: DefaultLocationOption[],
  customLocations: CustomPlannerLocation[],
): LocationSummary {
  const defaults = defaultOptions.filter((option) => option.selected).length;
  const customs = customLocations.length;
  return {
    defaults,
    customs,
    total: defaults + customs,
  };
}

function selectionsHash(selections: PlannerSelection[]): string {
  return JSON.stringify(selections);
}

function applySelectionsToDefaults(
  defaultOptions: DefaultLocationOption[],
  selections: PlannerSelection[],
): DefaultLocationOption[] {
  const selectedSet = new Set(
    selections
      .filter((selection) => selection.source === "default")
      .map((selection) => selection.name.toLowerCase()),
  );

  return defaultOptions.map((option) => ({
    ...option,
    selected: selectedSet.has(option.value.toLowerCase()),
  }));
}

function buildCustomLocationsFromSelections(selections: PlannerSelection[]): CustomPlannerLocation[] {
  const customSelections = selections.filter((selection) => selection.source === "custom");
  return customSelections.map((selection, index) => ({
    id: generateCustomLocationId(selection.name, index),
    name: selection.name,
    icon: selection.icon ?? null,
  }));
}

function generateCustomLocationId(seed: string, index: number) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const safeSeed = seed && seed.trim().length > 0 ? seed.trim().toLowerCase() : "location";
  return `${safeSeed}-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

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
  locations,
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
          locations={locations}
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
  const [isApplyingIcon, startApplyingIcon] = useTransition();
  const lastHandledStatus = useRef<"idle" | "success" | "error">("idle");
  const activeOption =
    kitchenIconOptions.find((option) => option.id === iconKey) ?? kitchenIconOptions[0];
  const ActiveIcon = activeOption.icon;
  const trimmedName = name.trim();
  const nothingChanged = trimmedName === initialKitchenName.trim() && iconKey === initialKitchenIconKey;
  const disableSave = trimmedName.length === 0 || nothingChanged;

  const submitIdentity = useCallback(
    (override?: { name?: string; icon?: KitchenIconId }) => {
      const targetName = override?.name ?? name;
      const persistedName = targetName.trim().length > 0 ? targetName.trim() : initialKitchenName;
      const targetIcon = override?.icon ?? iconKey;
      const formData = new FormData();
      formData.append("kitchenId", kitchenId);
      formData.append("kitchenName", persistedName);
      formData.append("iconKey", targetIcon);
      formAction(formData);
    },
    [formAction, iconKey, initialKitchenName, kitchenId, name],
  );

  const handleApplyIcon = useCallback(
    (nextIcon: KitchenIconId) => {
      setIconKey(nextIcon);
      startApplyingIcon(() => {
        submitIdentity({ icon: nextIcon });
      });
    },
    [submitIdentity],
  );

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
              <KitchenIconSelector
                value={iconKey}
                onChange={setIconKey}
                onApplyIcon={handleApplyIcon}
                isApplyingIcon={isApplyingIcon}
              />
            </div>
            <div className="flex flex-col items-center space-y-2 text-center lg:items-start lg:text-left">
              <Label htmlFor="kitchenName-input" className="w-full max-w-sm text-left">
                Kitchen name
              </Label>
              <Input
                id="kitchenName-input"
                name="kitchenName"
                value={name}
                onChange={(event) => setName(event.target.value.slice(0, 120))}
                placeholder="The Swartz Kitchen"
                maxLength={120}
                className="w-full max-w-sm"
              />
              <div className="flex w-full max-w-sm flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={trimmedName === initialKitchenName.trim()}
                  onClick={() => setName(initialKitchenName)}
                >
                  Reset
                </Button>
                <CardSubmitButton label="Save name" disabled={disableSave} />
              </div>
            </div>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}

type KitchenIconSelectorProps = {
  value: KitchenIconId;
  onChange: (value: KitchenIconId) => void;
  onApplyIcon?: (value: KitchenIconId) => void;
  isApplyingIcon?: boolean;
};

function KitchenIconSelector({ value, onChange, onApplyIcon, isApplyingIcon }: KitchenIconSelectorProps) {
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
            disabled={isApplyingIcon}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pendingIcon === value || Boolean(isApplyingIcon)}
            onClick={() => {
              if (pendingIcon === value) {
                setOpen(false);
                return;
              }
              onChange(pendingIcon);
              onApplyIcon?.(pendingIcon);
              setOpen(false);
            }}
          >
            {isApplyingIcon ? "Saving…" : "Use icon"}
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
  locations,
}: {
  kitchenId: string;
  defaultOptions: DefaultLocationOption[];
  initialCustomLocations: CustomPlannerLocation[];
  locations: LocationSummary[];
}) {
  const [state, formAction] = useActionState<KitchenSettingsActionState, FormData>(
    updateKitchenSettings,
    defaultKitchenSettingsState,
  );
  const [isSavingLocations, startSavingLocations] = useTransition();
  const [plannerDefaults, setPlannerDefaults] = useState(defaultOptions);
  const [plannerCustomLocations, setPlannerCustomLocations] = useState(initialCustomLocations);
  const [resetSignal, setResetSignal] = useState(0);
  const initialSummary = summarizeInitialLocations(defaultOptions, initialCustomLocations);
  const [locationSummary, setLocationSummary] = useState<LocationSummary>(initialSummary);
  const [baselineSummary, setBaselineSummary] = useState<LocationSummary>(initialSummary);
  const [currentHash, setCurrentHash] = useState<string | null>(null);
  const [lastSavedHash, setLastSavedHash] = useState<string | null>(null);
  const [confirmRemovalOpen, setConfirmRemovalOpen] = useState(false);
  const [removedLocations, setRemovedLocations] = useState<string[]>([]);
  const baselineSelectionsRef = useRef<PlannerSelection[] | null>(null);
  const latestSelectionsRef = useRef<PlannerSelection[]>([]);
  const expectingBaselineRef = useRef(true);
  const lastHandledStatus = useRef<"idle" | "success" | "error">("idle");
  const pendingFormDataRef = useRef<FormData | null>(null);

  useEffect(() => {
    setPlannerDefaults(defaultOptions);
    setPlannerCustomLocations(initialCustomLocations);
    const summary = summarizeInitialLocations(defaultOptions, initialCustomLocations);
    setLocationSummary(summary);
    setBaselineSummary(summary);
    baselineSelectionsRef.current = null;
    latestSelectionsRef.current = [];
    expectingBaselineRef.current = true;
    setCurrentHash(null);
    setLastSavedHash(null);
    setResetSignal((value) => value + 1);
  }, [defaultOptions, initialCustomLocations]);

  const applySelectionsToPlanner = useCallback(
    (selections: PlannerSelection[]) => {
      setPlannerDefaults(applySelectionsToDefaults(defaultOptions, selections));
      setPlannerCustomLocations(buildCustomLocationsFromSelections(selections));
      setResetSignal((value) => value + 1);
    },
    [defaultOptions],
  );

  const handlePlannerChange = useCallback(
    (change: { summary: LocationSummary; locations: PlannerSelection[] }) => {
      setLocationSummary((previous) => {
        if (
          previous.total === change.summary.total &&
          previous.defaults === change.summary.defaults &&
          previous.customs === change.summary.customs
        ) {
          return previous;
        }
        return change.summary;
      });

      latestSelectionsRef.current = change.locations;
      const nextHash = selectionsHash(change.locations);
      setCurrentHash(nextHash);

      if (expectingBaselineRef.current) {
        baselineSelectionsRef.current = change.locations.map((selection) => ({ ...selection }));
        setBaselineSummary(change.summary);
        setLastSavedHash(nextHash);
        expectingBaselineRef.current = false;
      }
    },
    [],
  );

  useEffect(() => {
    if (state.status === "success" && lastHandledStatus.current !== "success") {
      toast.success("Storage locations saved");
      const latestSelections = latestSelectionsRef.current;
      baselineSelectionsRef.current = latestSelections.map((selection) => ({ ...selection }));
      setBaselineSummary(locationSummary);
      if (currentHash) {
        setLastSavedHash(currentHash);
      }
      setConfirmRemovalOpen(false);
      pendingFormDataRef.current = null;
      setRemovedLocations([]);
    } else if (state.status === "error" && lastHandledStatus.current !== "error") {
      toast.error("Couldn’t save locations", {
        description: state.error ?? "Try again shortly.",
      });
    }
    lastHandledStatus.current = state.status;
  }, [state.status, state.error, currentHash, locationSummary]);

  const hasSnapshot = Boolean(currentHash && lastSavedHash);
  const disableSubmit = locationSummary.total === 0 || !hasSnapshot || currentHash === lastSavedHash;
  const disableReset = !hasSnapshot || currentHash === lastSavedHash;
  const locationUnitCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const location of locations) {
      map.set(normalizeLocationName(location.name), location.totalUnits ?? 0);
    }
    return map;
  }, [locations]);

  const computeRemovedLocations = useCallback(() => {
    const baseline = baselineSelectionsRef.current ?? [];
    const latest = latestSelectionsRef.current;
    const latestKeys = new Set(latest.map((selection) => selection.name.trim().toLowerCase()));
    return baseline
      .filter((selection) => !latestKeys.has(selection.name.trim().toLowerCase()))
      .map((selection) => selection.name);
  }, []);

  const handleSubmitLocations = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (disableSubmit) {
        return;
      }

      const removed = computeRemovedLocations();
      const removedWithInventory = removed.filter(
        (name) => (locationUnitCounts.get(normalizeLocationName(name)) ?? 0) > 0,
      );
      const formData = new FormData(event.currentTarget);

      if (removedWithInventory.length > 0) {
        pendingFormDataRef.current = formData;
        setRemovedLocations(removedWithInventory);
        setConfirmRemovalOpen(true);
        return;
      }

      startSavingLocations(() => {
        formAction(formData);
      });
    },
    [computeRemovedLocations, disableSubmit, formAction, locationUnitCounts],
  );

  const handleConfirmRemoval = useCallback(() => {
    if (!pendingFormDataRef.current) {
      setConfirmRemovalOpen(false);
      return;
    }
    const pending = pendingFormDataRef.current;
    if (pending) {
      startSavingLocations(() => {
        formAction(pending);
      });
    }
    pendingFormDataRef.current = null;
    setRemovedLocations([]);
    setConfirmRemovalOpen(false);
  }, [formAction]);

  const handleCancelRemoval = useCallback(() => {
    pendingFormDataRef.current = null;
    setRemovedLocations([]);
    setConfirmRemovalOpen(false);
    if (!baselineSelectionsRef.current || !lastSavedHash) {
      return;
    }
    applySelectionsToPlanner(baselineSelectionsRef.current);
    setLocationSummary(baselineSummary);
    setCurrentHash(lastSavedHash);
  }, [applySelectionsToPlanner, baselineSummary, lastSavedHash]);

  const handleResetLocations = useCallback(() => {
    if (!baselineSelectionsRef.current || !lastSavedHash) {
      return;
    }
    applySelectionsToPlanner(baselineSelectionsRef.current);
    setLocationSummary(baselineSummary);
    setCurrentHash(lastSavedHash);
  }, [applySelectionsToPlanner, baselineSummary, lastSavedHash]);

  return (
    <Card
      className={cn(
        "shadow-sm transition-colors",
        locationSummary.total === 0 && "border-red-400 dark:border-red-500",
      )}
    >
      <form action={formAction} onSubmit={handleSubmitLocations}>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Storage locations</CardTitle>
            <CardDescription>
              Tell us where ingredients live so everyone files items back in the right spot.
            </CardDescription>
          </div>
          <div
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap",
              locationSummary.total === 0
                ? "border-red-400 bg-red-500/10 text-red-600 dark:border-red-500 dark:bg-red-500/15 dark:text-red-200"
                : "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200",
            )}
          >
            {locationSummary.total === 0
              ? "0 locations selected"
              : `${locationSummary.total} locations selected`}
          </div>
        </CardHeader>
        <CardContent>
          <input type="hidden" name="kitchenId" value={kitchenId} />
          <LocationPlanner
            defaultOptions={plannerDefaults}
            initialCustomLocations={plannerCustomLocations}
            onSelectionChange={handlePlannerChange}
            resetSignal={resetSignal}
          />
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-end">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button type="button" variant="ghost" disabled={disableReset} onClick={handleResetLocations}>
              Reset
            </Button>
            <CardSubmitButton label="Save locations" disabled={disableSubmit} />
          </div>
        </CardFooter>
      </form>
      <AlertDialog
        open={confirmRemovalOpen}
        onOpenChange={(open) => {
          if (!open) {
            pendingFormDataRef.current = null;
            setRemovedLocations([]);
          }
          setConfirmRemovalOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove locations?</AlertDialogTitle>
            <AlertDialogDescription>
              Removing a location will permanently delete all inventory stored there. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {removedLocations.length > 0 ? (
            <div className="mt-2 space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Locations with inventory
              </p>
              <div className="space-y-2">
                {removedLocations.map((name) => {
                  const count = locationUnitCounts.get(normalizeLocationName(name)) ?? 0;
                  return (
                    <div key={name} className="flex items-center justify-between gap-3">
                      <span className="font-medium">{name}</span>
                      <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-semibold">
                        {count} item{count === 1 ? "" : "s"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelRemoval} disabled={isSavingLocations}>
              Keep locations
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemoval}
              disabled={isSavingLocations}
              className="bg-red-600 hover:bg-red-500"
            >
              Remove locations
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
