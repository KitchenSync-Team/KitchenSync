"use client";

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

export function NotificationBell() {
  // ****** #LATER WE CAN FETCH REAL NOTIFICATIONS HERE# ****** 
  const hasUnread = true; 

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
            variant="ghost" 
            size="icon" 
            // 'cursor-pointer' ensures the hand icon appears on hover
            className="relative h-8 w-8 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:bg-accent cursor-pointer"
        >
          <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
          
          {/* Red Dot for Unread Messages */}
          {hasUnread && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-600 border-2 border-background" />
          )}
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Mock Notifications */}
        <DropdownMenuItem className="cursor-pointer flex flex-col items-start gap-1 p-3">
            <span className="font-medium text-sm">Milk is expiring!</span>
            <span className="text-xs text-muted-foreground">Whole Milk expires in 2 days.</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem className="cursor-pointer flex flex-col items-start gap-1 p-3">
            <span className="font-medium text-sm">New Recipe Found</span>
            <span className="text-xs text-muted-foreground">Based on your leftover chicken.</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer justify-center text-primary font-medium">
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}