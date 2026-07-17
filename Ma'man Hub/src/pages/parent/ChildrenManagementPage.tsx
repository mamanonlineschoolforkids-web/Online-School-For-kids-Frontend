import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users, Plus, Search, Trash2, Loader2, AlertCircle, Mail, CheckCircle2, UserPlus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { parentService, type Child, type ChildProfilePreview } from "@/services/parentService";

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-green-100 text-green-800" },
  suspended: { label: "Suspended", className: "bg-red-100 text-red-800" },
  email_not_verified: { label: "Email not verified", className: "bg-yellow-100 text-yellow-800" },
};

type AddStep = "email" | "found" | "create" | "invited";

const emptyCreateForm = {
  fullName: "", email: "", password: "", confirmPassword: "", dateOfBirth: "", country: "",
};

export default function ChildrenManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: children = [], isLoading, error } = useQuery({
    queryKey: ["parent-children"],
    queryFn: parentService.getLinkedChildren,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<AddStep>("email");
  const [searchEmail, setSearchEmail] = useState("");
  const [foundChild, setFoundChild] = useState<ChildProfilePreview | null>(null);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [removingChild, setRemovingChild] = useState<Child | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["parent-children"] });

  const searchMutation = useMutation({
    mutationFn: (email: string) => parentService.searchChildByEmail(email),
    onSuccess: (result) => {
      if (result.exists && result.child) {
        setFoundChild(result.child);
        setStep("found");
      } else {
        setCreateForm((p) => ({ ...p, email: searchEmail }));
        setStep("create");
      }
    },
    onError: (err: any) => {
      toast({ title: "Search failed", description: err?.response?.data?.message, variant: "destructive" });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (childId: string) => parentService.sendChildLinkInvite(childId),
    onSuccess: () => {
      setStep("invited");
    },
    onError: (err: any) => {
      toast({ title: "Couldn't send invite", description: err?.response?.data?.message, variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: () => parentService.createAndLinkChild(createForm),
    onSuccess: () => {
      invalidate();
      toast({ title: "Child account created", description: "A verification email has been sent to them." });
      closeDialog();
    },
    onError: (err: any) => {
      toast({ title: "Couldn't create account", description: err?.response?.data?.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (childId: string) => parentService.removeChild(childId),
    onSuccess: () => {
      invalidate();
      toast({ title: "Child removed" });
      setRemovingChild(null);
    },
    onError: (err: any) => {
      toast({ title: "Couldn't remove child", description: err?.response?.data?.message, variant: "destructive" });
      setRemovingChild(null);
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setStep("email");
    setSearchEmail("");
    setFoundChild(null);
    setCreateForm(emptyCreateForm);
  };

  const handleSearch = () => {
    if (!searchEmail.trim() || !/\S+@\S+\.\S+/.test(searchEmail)) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }
    searchMutation.mutate(searchEmail.trim());
  };

  const handleCreate = () => {
    if (!createForm.fullName.trim() || createForm.fullName.trim().length < 2) {
      toast({ title: "Enter the child's full name", variant: "destructive" }); return;
    }
    if (!createForm.dateOfBirth) {
      toast({ title: "Enter date of birth", variant: "destructive" }); return;
    }
    if (createForm.password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" }); return;
    }
    if (createForm.password !== createForm.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" }); return;
    }
    if (!createForm.country.trim()) {
      toast({ title: "Enter a country", variant: "destructive" }); return;
    }
    createMutation.mutate();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Children</h1>
            <p className="text-muted-foreground">Link and manage your children's accounts</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Child
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p>Loading…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p>Couldn't load your children. Please try again.</p>
          </div>
        ) : children.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <Users className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="font-medium">No children linked yet</p>
              <p className="text-sm text-muted-foreground">
                Add a child to start tracking their learning progress.
              </p>
              <Button className="mt-2" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Child
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => {
              const status = statusConfig[child.status] ?? statusConfig.active;
              return (
                <Card key={child.id}>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={child.profilePictureUrl ?? child.avatar} />
                        <AvatarFallback>{child.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{child.name}</p>
                        <p className="text-sm text-muted-foreground">Age {child.age}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge className={status.className}>{status.label}</Badge>
                      <span className="text-sm text-muted-foreground">{child.courses} course{child.courses === 1 ? "" : "s"}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => setRemovingChild(child)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Remove
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add child dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          {step === "email" && (
            <>
              <DialogHeader>
                <DialogTitle>Add a Child</DialogTitle>
                <DialogDescription>
                  Enter your child's email to check if they already have an account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <Label htmlFor="child-email">Child's email</Label>
                <Input
                  id="child-email"
                  type="email"
                  placeholder="child@example.com"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button onClick={handleSearch} disabled={searchMutation.isPending}>
                  {searchMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    : <Search className="h-4 w-4 mr-1.5" />}
                  Search
                </Button>
              </DialogFooter>
            </>
          )}

          {step === "found" && foundChild && (
            <>
              <DialogHeader>
                <DialogTitle>Account Found</DialogTitle>
              </DialogHeader>
              <div className="py-2 space-y-4">
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={foundChild.profilePictureUrl ?? undefined} />
                    <AvatarFallback>{foundChild.fullName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{foundChild.fullName}</p>
                    <p className="text-sm text-muted-foreground">{foundChild.email} · Age {foundChild.age}</p>
                  </div>
                </div>
                {foundChild.isAlreadyLinked ? (
                  <p className="text-sm text-destructive flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    This account is already linked to another parent.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-4 w-4 shrink-0" />
                    We'll send them an email to confirm linking your accounts.
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStep("email")}>Back</Button>
                <Button
                  disabled={foundChild.isAlreadyLinked || inviteMutation.isPending}
                  onClick={() => inviteMutation.mutate(foundChild.id)}
                >
                  {inviteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  Send Invite
                </Button>
              </DialogFooter>
            </>
          )}

          {step === "invited" && (
            <>
              <DialogHeader>
                <DialogTitle>Invite Sent</DialogTitle>
              </DialogHeader>
              <div className="py-6 text-center space-y-3">
                <CheckCircle2 className="h-10 w-10 mx-auto text-green-600" />
                <p className="text-sm text-muted-foreground">
                  We've emailed {foundChild?.fullName} a link to confirm. Once they accept, they'll appear in your children list.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={closeDialog} className="w-full">Done</Button>
              </DialogFooter>
            </>
          )}

          {step === "create" && (
            <>
              <DialogHeader>
                <DialogTitle>Create Child Account</DialogTitle>
                <DialogDescription>
                  No account found for that email — let's create one.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-2">
                  <Label htmlFor="c-name">Full name</Label>
                  <Input id="c-name" value={createForm.fullName} onChange={(e) => setCreateForm((p) => ({ ...p, fullName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-email">Email</Label>
                  <Input id="c-email" type="email" value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="c-dob">Date of birth</Label>
                    <Input id="c-dob" type="date" value={createForm.dateOfBirth} onChange={(e) => setCreateForm((p) => ({ ...p, dateOfBirth: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-country">Country</Label>
                    <Input id="c-country" value={createForm.country} onChange={(e) => setCreateForm((p) => ({ ...p, country: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="c-pass">Password</Label>
                    <Input id="c-pass" type="password" value={createForm.password} onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-confirm">Confirm password</Label>
                    <Input id="c-confirm" type="password" value={createForm.confirmPassword} onChange={(e) => setCreateForm((p) => ({ ...p, confirmPassword: e.target.value }))} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStep("email")}>Back</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    : <UserPlus className="h-4 w-4 mr-1.5" />}
                  Create & Link
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <AlertDialog open={!!removingChild} onOpenChange={(open) => !open && setRemovingChild(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removingChild?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This unlinks their account from yours. You'll stop seeing their progress, and they'll need a new invite to be re-linked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeMutation.isPending}
              onClick={() => removingChild && removeMutation.mutate(removingChild.id)}
            >
              {removeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}