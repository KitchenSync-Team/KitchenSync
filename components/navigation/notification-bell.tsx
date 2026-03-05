"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
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
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const hasUnread = pendingInvites.length > 0;

  const handleAccept = async (inviteId: string) => {
    setPendingIds((prev) => new Set(prev).add(inviteId));
    const formData = new FormData();
    formData.set("inviteId", inviteId);
    const result = await acceptInvitation(formData);
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(inviteId);
      return next;
    });
    if (result.error) {
      toast.error(result.error);
    }
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
                  disabled={pendingIds.has(invite.id)}
                  onClick={() => handleAccept(invite.id)}
                >
                  {pendingIds.has(invite.id) ? "Joining…" : "Accept"}
                </Button>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
