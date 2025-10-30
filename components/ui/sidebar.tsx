"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { PanelLeftIcon } from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarContextProps = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);

  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }

      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    },
    [setOpenProp, open],
  );

  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((state) => !state) : setOpen((state) => !state);
  }, [isMobile, setOpen, setOpenMobile]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  const state = open ? "expanded" : "collapsed";

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        data-state={state}
        data-collapsible={state === "collapsed" ? "icon" : "full"}
        className={cn(
          "group/sidebar-wrapper has-[[data-sidebar=sidebar]]:flex min-h-svh flex-1",
          className,
        )}
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            ...style,
          } as React.CSSProperties
        }
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

const sidebarVariants = cva(
  "group/sidebar grid data-[variant=inset]:w-(--sidebar-width) data-[variant=inset]:max-w-[calc(100vw-12rem)] data-[variant=floating]:w-(--sidebar-width) data-[variant=floating]:max-w-[calc(100vw-8rem)]",
  {
    variants: {
      variant: {
        sidebar: "border-border/50 relative z-30 h-svh border-r bg-sidebar text-sidebar-foreground",
        inset:
          "border-border relative z-40 hidden h-svh border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-linear group-data-[collapsible=icon]/sidebar-wrapper:w-(--sidebar-width-icon) group-data-[collapsible=icon]/sidebar-wrapper:[&>[data-sidebar=menu-action]]:hidden md:flex",
        floating:
          "flex w-(--sidebar-width) max-w-[calc(100vw-3rem)] flex-1 group-data-[collapsible=icon]/sidebar-wrapper:hidden lg:flex",
      },
    },
    defaultVariants: {
      variant: "sidebar",
    },
  },
);

function Sidebar({
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof sidebarVariants> & {
    collapsible?: "offcanvas" | "icon" | "none";
  }) {
  const { isMobile, state, toggleSidebar, openMobile, setOpenMobile } = useSidebar();

  React.useEffect(() => {
    if (collapsible === "icon") {
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${state === "collapsed"}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    }
  }, [collapsible, state]);

  if (collapsible === "none") {
    return (
      <div
        data-sidebar="sidebar"
        className={cn(sidebarVariants({ variant }), "h-svh", className)}
        {...props}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent side="left" className="w-(--sidebar-width)">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Select a page to navigate to.</SheetDescription>
          </SheetHeader>
          <div className={cn(sidebarVariants({ variant }), "h-full border-r-0", className)} {...props}>
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      data-sidebar="sidebar"
      data-collapsible={state === "collapsed" ? collapsible : undefined}
      className={cn(sidebarVariants({ variant }), className)}
      {...props}
    >
      {collapsible === "offcanvas" ? (
        <>
          <div>{children}</div>
          <div
            className="hidden border-r bg-background/80 transition duration-200 ease-linear group-data-[state=expanded]/sidebar-wrapper:block"
            style={{ width: "var(--sidebar-width)" }}
          />
        </>
      ) : (
        children
      )}
      <div className="absolute right-0 top-3 flex h-8 items-center transition duration-200 ease-linear group-data-[state=collapsed]/sidebar-wrapper:[display:none] group-data-[state=expanded]:translate-x-4 group-data-[state=collapsed]:translate-x-0">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shadow-xs"
                onClick={toggleSidebar}
              >
                <PanelLeftIcon className="size-4" />
                <span className="sr-only">Toggle Sidebar</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" align="center">
              Toggle sidebar
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

function SidebarTrigger({
  className,
  showOnHover,
  ...props
}: React.ComponentProps<typeof Button> & {
  showOnHover?: boolean;
}) {
  const { toggleSidebar, state } = useSidebar();

  return (
    <Button
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn(
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground",
        showOnHover &&
          "group-data-[collapsible=icon]/sidebar-wrapper:opacity-0 group-data-[collapsible=icon]/sidebar-wrapper:group-hover/sidebar-wrapper:opacity-100 group-data-[collapsible=icon]:hidden",
        className,
      )}
      onClick={toggleSidebar}
      {...props}
    >
      {state === "collapsed" ? <PanelLeftIcon className="size-4" /> : <PanelLeftIcon className="size-4" />}
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      data-sidebar="rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      className={cn(
        "bg-sidebar pointer-events-auto absolute inset-y-0 -right-4 z-20 hidden h-full w-4 place-items-center rounded-r-lg border-y border-r border-sidebar-border transition duration-200 ease-linear group-data-[collapsible=icon]/sidebar-wrapper:grid",
        className,
      )}
      {...props}
    >
      <div className="bg-border/40 flex h-16 w-1 rounded-full" />
    </button>
  );
}

function SidebarInset({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-sidebar="inset"
      className={cn(
        "relative flex-1 border-border/50 bg-background/60 transition-[width] duration-200 ease-linear group-data-[variant=inset]:border-l group-data-[variant=inset]:pl-6",
        className,
      )}
      {...props}
    />
  );
}

function SidebarHeader({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-sidebar="header"
      className={cn(
        "flex flex-col flex-1 overflow-hidden border-border/60 border-b px-4 py-2",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function SidebarFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-sidebar="footer"
      className={cn("border-border/60 border-t px-4 py-3", className)}
      {...props}
    />
  );
}

function SidebarContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-sidebar="content"
      className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-6", className)}
      {...props}
    />
  );
}

function SidebarGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-sidebar="group"
      className={cn("flex flex-col gap-3", className)}
      {...props}
    />
  );
}

function SidebarGroupLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-sidebar="group-label"
      className={cn("text-sidebar-foreground/60 px-2 text-xs font-semibold uppercase tracking-wide", className)}
      {...props}
    />
  );
}

function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-sidebar="group-content"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function SidebarMenu({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-sidebar="menu"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  );
}

function SidebarMenuItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-sidebar="menu-item"
      className={cn("group relative", className)}
      {...props}
    />
  );
}

const sidebarMenuButtonVariants = cva(
  "flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm transition-colors data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
  {
    variants: {
      variant: {
        default:
          "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground",
        outline:
          "border border-sidebar-border/60 bg-background hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      },
      size: {
        default: "h-9",
        sm: "h-8 text-xs",
        lg: "h-10 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function SidebarMenuButton({
  className,
  asChild = false,
  tooltip,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof Button> &
  VariantProps<typeof sidebarMenuButtonVariants> & {
    tooltip?: React.ReactNode;
  }) {
  const Comp = asChild ? Slot : "button";

  const { state } = useSidebar();

  const button = (
    <Comp
      data-sidebar="menu-button"
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      {...props}
    />
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" align="center">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (state === "collapsed") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" align="center">
          <span className="capitalize">{props.children}</span>
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

function SidebarMenuAction({
  className,
  showOnHover,
  ...props
}: React.ComponentProps<typeof Button> & {
  showOnHover?: boolean;
}) {
  return (
    <Button
      data-sidebar="menu-action"
      variant="ghost"
      size="icon"
      className={cn(
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground",
        showOnHover &&
          "group-data-[collapsible=icon]/sidebar-wrapper:opacity-0 group-hover:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuBadge({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-sidebar="menu-badge"
      className={cn(
        "bg-sidebar-primary/10 text-sidebar-primary inline-flex items-center rounded-full px-2 text-xs font-medium",
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<"div"> & {
  showIcon?: boolean;
}) {
  const width = React.useMemo(() => `${Math.floor(Math.random() * 40) + 50}%`, []);

  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      className={cn("flex h-8 items-center gap-2 rounded-md px-2", className)}
      {...props}
    >
      {showIcon ? <Skeleton className="size-4 rounded-md" /> : null}
      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1"
        style={{ "--skeleton-width": width } as React.CSSProperties}
      />
    </div>
  );
}

function SidebarMenuSub({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={cn(
        "border-sidebar-border mx-3.5 flex flex-col gap-1 border-l px-2.5 py-0.5 group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuSubItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      className={cn("group/menu-sub-item relative", className)}
      {...props}
    />
  );
}

function SidebarMenuSubButton({
  asChild = false,
  size = "md",
  isActive = false,
  className,
  ...props
}: React.ComponentProps<"a"> & {
  asChild?: boolean;
  size?: "sm" | "md";
  isActive?: boolean;
}) {
  const Comp = asChild ? Slot : "a";

  return (
    <Comp
      data-slot="sidebar-menu-sub-button"
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sm outline-hidden focus-visible:ring-2 group-data-[collapsible=icon]:hidden",
        isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        className,
      )}
      {...props}
    />
  );
}

function SidebarInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-sidebar="input"
      className={cn(
        "bg-sidebar text-sidebar-foreground placeholder:text-sidebar-foreground/80 h-8",
        className,
      )}
      {...props}
    />
  );
}

function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-sidebar="separator"
      className={cn("bg-sidebar-border", className)}
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};
