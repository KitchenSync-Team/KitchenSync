"use client";

import type { CSSProperties } from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ toastOptions, position = "top-center", ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const mergedToastOptions: ToasterProps["toastOptions"] = {
    duration: 6000,
    ...toastOptions,
    classNames: {
      toast:
        "group rounded-lg border border-border bg-background/95 text-foreground shadow-lg backdrop-blur-sm",
      title: "text-sm font-semibold",
      description: "text-sm text-muted-foreground",
      actionButton:
        "rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90",
      error:
        "border-destructive/40 bg-destructive/10 text-destructive-foreground dark:border-destructive/25 dark:bg-destructive/12",
      ...toastOptions?.classNames,
    },
  };

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position={position}
      closeButton={false}
      toastOptions={mergedToastOptions}
      icons={{
        error: null,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
