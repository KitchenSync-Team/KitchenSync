"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, MoreHorizontal, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  cancelInvitation,
  inviteMember,
  removeMember,
  resendInvitation,
  updateMemberRole,
  type MemberActionResult,
} from "@/app/protected/(app)/kitchen-settings/member-actions";
import type { KitchenInviteSummary, KitchenMember } from "@/lib/domain/kitchen";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_OPTIONS, type KitchenRole as RoleOption } from "@/components/kitchen-settings/roles";

const ROLE_LABELS: Record<RoleOption, string> = {
  owner: "Owner",
  member: "Member",
};

type MembersCardProps = {
  kitchenId: string;
  members: KitchenMember[];
  pendingInvites: KitchenInviteSummary[];
  currentUserId: string;
  memberCount: number;
};

export function MembersCard({
  kitchenId,
  members,
  pendingInvites,
  currentUserId,
  memberCount,
}: MembersCardProps) {
  const router = useRouter();
  const [managerOpen, setManagerOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<RoleOption>("member");
  const [memberToRemove, setMemberToRemove] = useState<KitchenMember | null>(null);
  const [inviteToCancel, setInviteToCancel] = useState<KitchenInviteSummary | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const ownerCount = useMemo(() => members.filter((member) => member.role === "owner").length, [members]);
  const currentUserRole = useMemo(() => {
    return members.find((member) => member.userId === currentUserId)?.role ?? "member";
  }, [currentUserId, members]);
  const normalizeRoleForSelection = (role: string): RoleOption => {
    return ROLE_OPTIONS.includes(role as RoleOption) ? (role as RoleOption) : "member";
  };

  const canInvite = currentUserRole === "owner";
  const canEditRoles = currentUserRole === "owner";

  const executeAction = (
    key: string,
    action: () => Promise<MemberActionResult>,
    successMessage: string,
    errorMessage: string,
  ) => {
    setPendingKey(key);
    startTransition(() => {
      void (async () => {
        const result = await action();
        if (result.success) {
          toast.success(successMessage);
          router.refresh();
        } else {
          toast.error(errorMessage, { description: result.error });
        }
        setPendingKey(null);
      })();
    });
  };

  const handleInvite = () => {
    executeAction(
      "invite-member",
      () => inviteMember({ kitchenId, email: inviteEmail, role: inviteRole }),
      "Invitation sent",
      "Couldn’t send invitation",
    );
    setInviteEmail("");
    setInviteRole("member");
  };

  const handleRoleChange = (member: KitchenMember, role: RoleOption) => {
    executeAction(
      `role-${member.userId}`,
      () => updateMemberRole({ kitchenId, memberId: member.userId, role }),
      "Member role updated",
      "Couldn’t update member role",
    );
  };

  const handleRemoveMember = () => {
    if (!memberToRemove) return;
    const target = memberToRemove;
    setMemberToRemove(null);
    executeAction(
      `remove-${target.userId}`,
      () => removeMember({ kitchenId, memberId: target.userId }),
      "Member removed",
      "Couldn’t remove member",
    );
  };

  const handleCancelInvite = () => {
    if (!inviteToCancel) return;
    const target = inviteToCancel;
    setInviteToCancel(null);
    executeAction(
      `cancel-invite-${target.id}`,
      () => cancelInvitation({ kitchenId, invitationId: target.id }),
      "Invitation cancelled",
      "Couldn’t cancel invitation",
    );
  };

  const handleResendInvite = (invite: KitchenInviteSummary) => {
    executeAction(
      `resend-invite-${invite.id}`,
      () => resendInvitation({ kitchenId, invitationId: invite.id }),
      "Invitation refreshed",
      "Couldn’t resend invitation",
    );
  };

  const canChangeRoleForMember = (member: KitchenMember) => {
    if (!canEditRoles) return false;
    return !(member.userId === currentUserId && member.role === "owner" && ownerCount <= 1);

  };

  const canRemoveMember = (member: KitchenMember) => {
    if (currentUserRole !== "owner") return false;
    if (member.role === "owner" && ownerCount <= 1) return false;
    return member.userId !== currentUserId || ownerCount > 1;
  };

  const isControlPending = (key: string) => isPending && pendingKey === key;
  const disableInviteSubmit = !inviteEmail || isControlPending("invite-member") || !canInvite;

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "No date";
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  const initials = (name?: string | null, email?: string | null) => {
    const source = name && name.trim().length > 0 ? name : email;
    if (!source) return "??";
    return source
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .join("")
      .slice(0, 2);
  };

  const accessMessage =
    memberCount <= 1 ? "Only you have access to this kitchen." : `Your kitchen has ${memberCount} members.`;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Kitchen members</CardTitle>
        <CardDescription>{accessMessage}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No members yet.</p>
        ) : (
          <div className="space-y-4">
            {members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center gap-3 rounded-lg border border-border/70 p-3 min-w-0"
              >
                <Avatar className="h-12 w-12">
                  {member.avatarUrl ? (
                    <AvatarImage src={member.avatarUrl} alt={member.name ?? member.email ?? ""} />
                  ) : null}
                  <AvatarFallback>{initials(member.name, member.email)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-1 items-center gap-3 min-w-0">
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium break-words">{member.name ?? "Pending profile"}</p>
                    {member.email ? (
                      <p className="text-xs text-muted-foreground break-words">{member.email}</p>
                    ) : null}
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {ROLE_LABELS[member.role] ?? member.role}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-end">
        <Dialog open={managerOpen} onOpenChange={setManagerOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="mr-2 h-4 w-4" /> Manage members
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[min(95vw,900px)] sm:w-full sm:max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage kitchen members</DialogTitle>
              <DialogDescription>Share this kitchen with your crew, invite newcomers, and keep invites tidy.</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No members yet.</p>
              ) : (
                <div className="w-full overflow-x-auto sm:overflow-visible">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => {
                        const normalizedRole = normalizeRoleForSelection(member.role);
                        const roleLabel = ROLE_LABELS[normalizedRole] ?? member.role;
                        const disableRoleSelect = !canChangeRoleForMember(member);
                        const disableRemove = !canRemoveMember(member);
                        return (
                          <TableRow key={member.userId}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  {member.avatarUrl ? (
                                    <AvatarImage src={member.avatarUrl} alt={member.name ?? member.email ?? ""} />
                                  ) : null}
                                  <AvatarFallback>{initials(member.name, member.email)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">{member.name ?? "Pending profile"}</p>
                                  <p className="text-xs text-muted-foreground">{member.email ?? "No email"}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="align-middle">
                              {disableRoleSelect ? (
                                <Badge variant="outline">{roleLabel}</Badge>
                              ) : (
                                <Select
                                  defaultValue={normalizedRole}
                                  onValueChange={(value) => handleRoleChange(member, value as RoleOption)}
                                  disabled={isControlPending(`role-${member.userId}`)}
                                >
                                  <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ROLE_OPTIONS.map((value) => (
                                      <SelectItem key={value} value={value}>
                                        {ROLE_LABELS[value]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(member.joinedAt)}
                            </TableCell>
                            <TableCell className="text-right">
                              {disableRemove ? (
                                <span className="text-xs text-muted-foreground">—</span>
                              ) : (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      aria-label="Member actions"
                                      disabled={isControlPending(`remove-${member.userId}`)}
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-600"
                                      onSelect={(event) => {
                                        event.preventDefault();
                                        setMemberToRemove(member);
                                      }}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" /> Remove from kitchen
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-sm font-medium">Pending invitations</h3>
                {pendingInvites.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending invitations right now.</p>
                ) : (
                  <div className="w-full overflow-x-auto sm:overflow-visible">
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Invited</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingInvites.map((invite) => {
                          const inviteRoleLabel =
                            ROLE_LABELS[normalizeRoleForSelection(invite.role)] ?? "Member";
                          return (
                            <TableRow key={invite.id}>
                              <TableCell>{invite.email}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{inviteRoleLabel}</Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(invite.createdAt)}
                              </TableCell>
                              <TableCell className="text-right">
                                {canInvite ? (
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={isControlPending(`resend-invite-${invite.id}`)}
                                      onClick={() => handleResendInvite(invite)}
                                    >
                                      Resend
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-red-600 hover:text-red-600"
                                      disabled={isControlPending(`cancel-invite-${invite.id}`)}
                                      onClick={() => setInviteToCancel(invite)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex flex-wrap items-center justify-end gap-2">
              {canInvite ? (
                <Button variant="outline" onClick={() => setInviteDialogOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" /> Invite member
                </Button>
              ) : null}
              <Button variant="outline" onClick={() => setManagerOpen(false)}>
                Close
              </Button>
            </DialogFooter>

            <AlertDialog open={Boolean(memberToRemove)} onOpenChange={(open) => !open && setMemberToRemove(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove member</AlertDialogTitle>
                  <AlertDialogDescription>
                    {memberToRemove
                      ? `Remove ${memberToRemove.name ?? memberToRemove.email ?? "this member"} from the kitchen?`
                      : ""}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep member</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRemoveMember} className="bg-red-600 hover:bg-red-500">
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={Boolean(inviteToCancel)} onOpenChange={(open) => !open && setInviteToCancel(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel invitation</AlertDialogTitle>
                  <AlertDialogDescription>
                    {inviteToCancel ? `Cancel the invite for ${inviteToCancel.email}?` : ""}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep invite</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancelInvite} className="bg-red-600 hover:bg-red-500">
                    Cancel invite
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DialogContent>
        </Dialog>

        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a member</DialogTitle>
              <DialogDescription>Send an invite that expires in 7 days.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email-modal">Email</Label>
                <Input
                  id="invite-email-modal"
                  type="email"
                  placeholder="alex@example.com"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  disabled={!canInvite}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role-modal">Role</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(value) => setInviteRole(value as RoleOption)}
                  disabled={!canInvite}
                >
                  <SelectTrigger id="invite-role-modal">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((value) => (
                      <SelectItem
                        key={value}
                        value={value}
                        disabled={value === "owner" && currentUserRole !== "owner"}
                      >
                        {ROLE_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="justify-end">
              <Button variant="ghost" onClick={() => setInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={disableInviteSubmit}
                onClick={() => {
                  handleInvite();
                  setInviteDialogOpen(false);
                }}
              >
                {isControlPending("invite-member") ? "Sending…" : "Send invite"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </CardFooter>
    </Card>
  );
}
