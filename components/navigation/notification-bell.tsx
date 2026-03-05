"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { acceptInvitation } from "@/app/protected/(app)/invite-actions";

type PendingInvite = {
  id: string;
  kitchenId: string;
  kitchenName: string;
  role: string;
};

type NotificationBellProps = {
  pendingInvites?: PendingInvite[];
};

export function NotificationBell({ pendingInvites = [] }: NotificationBellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const hasUnread = pendingInvites.length > 0;

  const handleAccept = (inviteId: string) => {
    const formData = new FormData();
    formData.set("inviteId", inviteId);
    startTransition(async () => {
      await acceptInvitation(formData);
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:bg-accent cursor-pointer"
        >
          <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
          {hasUnread && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-600 border-2 border-background" />
          )}
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {pendingInvites.length === 0 ? (
          <DropdownMenuItem disabled className="text-sm text-muted-foreground justify-center py-4">
            No new notifications
          </DropdownMenuItem>
        ) : (
          pendingInvites.map((invite) => (
            <DropdownMenuItem key={invite.id} asChild className="p-0 focus:bg-transparent">
              <div className="flex flex-col items-start gap-2 p-3 w-full">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-sm">Kitchen invitation</span>
                  <span className="text-xs text-muted-foreground">
                    You&apos;ve been invited to join{" "}
                    <span className="font-medium text-foreground">{invite.kitchenName}</span> as {invite.role}.
                  </span>
                </div>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={isPending}
                  onClick={() => handleAccept(invite.id)}
                >
                  {isPending ? "Joining…" : "Accept"}
                </Button>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
