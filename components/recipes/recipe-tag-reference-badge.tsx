"use client";

import { useRef, useState } from "react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getRecipeTagMeta } from "@/lib/recipes/tag-display";
import { cn } from "@/lib/supabase/utils";

type RecipeTagReferenceBadgeProps = {
  tag: string;
  variant?: BadgeProps["variant"];
  className?: string;
  warningTitle?: string | null;
  warningItems?: string[];
  warningNote?: string | null;
};

export function RecipeTagReferenceBadge({
  tag,
  variant = "secondary",
  className,
  warningTitle = null,
  warningItems = [],
  warningNote = null,
}: RecipeTagReferenceBadgeProps) {
  const meta = getRecipeTagMeta(tag);
  const Icon = meta.Icon;
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const suppressNextCloseRef = useRef(false);

  const hasWarning = Boolean(warningTitle || warningItems.length > 0 || warningNote);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        // When hover-opened, clicking the trigger can emit a close event first.
        // Ignore that one close so click can pin the card open.
        if (!next && suppressNextCloseRef.current) {
          suppressNextCloseRef.current = false;
          return;
        }
        setOpen(next);
        if (!next) setPinned(false);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex focus:outline-none"
          onMouseEnter={() => {
            if (!pinned) setOpen(true);
          }}
          onMouseLeave={() => {
            if (!pinned) setOpen(false);
          }}
          onClick={() => {
            suppressNextCloseRef.current = true;
            setPinned(true);
            setOpen(true);
          }}
          aria-label={`About ${meta.label}`}
        >
          <Badge
            variant={variant}
            className={cn(
              "inline-flex items-center gap-1 cursor-help",
              hasWarning &&
                "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-900/40",
              className,
            )}
          >
            <Icon className="h-3 w-3" />
            {meta.label}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80"
        align="start"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => {
          if (!pinned) setOpen(false);
        }}
      >
        <PopoverHeader>
          <PopoverTitle className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {meta.label}
          </PopoverTitle>
          <PopoverDescription>{meta.description}</PopoverDescription>
        </PopoverHeader>
        {hasWarning && (
          <div className="mt-3 rounded-md border border-amber-300/70 bg-amber-50/70 px-2.5 py-2 text-xs text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/30 dark:text-amber-200">
            {warningTitle && <p className="font-semibold">{warningTitle}</p>}
            {warningItems.length > 0 && (
              <ul className="mt-1 list-disc pl-4">
                {warningItems.map((item) => (
                  <li key={`${meta.key}-warn-${item}`}>{item}</li>
                ))}
              </ul>
            )}
            {warningNote && <p className={cn(warningItems.length > 0 && "mt-1")}>{warningNote}</p>}
          </div>
        )}
        {meta.alsoFits.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-foreground">Also fits</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {meta.alsoFits.map((item) => (
                <Badge key={`${meta.key}-also-${item}`} variant="outline">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {meta.note && <p className="mt-3 text-xs text-muted-foreground">{meta.note}</p>}
        <p className="mt-3 text-[11px] text-muted-foreground">
          Hover to preview. Click to pin this card.
        </p>
      </PopoverContent>
    </Popover>
  );
}
