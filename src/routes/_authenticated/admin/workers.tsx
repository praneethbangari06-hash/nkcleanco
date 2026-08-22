import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Loader2, Pencil, Plus, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createWorker, listWorkers, updateWorker } from "@/lib/admin-workers.functions";

export const Route = createFileRoute("/_authenticated/admin/workers")({
  head: () => ({
    meta: [
      { title: "Workers — NK CleanCo Admin" },
      {
        name: "description",
        content:
          "Create cleaner accounts, edit their details, reset passwords and deactivate staff for the NK CleanCo worker app.",
      },
      { property: "og:title", content: "Workers — NK CleanCo Admin" },
      {
        property: "og:description",
        content: "Manage the NK CleanCo cleaning staff roster and worker app logins.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WorkersPage,
});

interface WorkerRow {
  id: string;
  name: string;
  phone: string;
  is_online: boolean;
  is_active: boolean;
  status: string;
  created_at: string;
}

const workersKey = ["admin", "workers"] as const;

function WorkersPage() {
  const fetchWorkers = useServerFn(listWorkers);
  const addWorker = useServerFn(createWorker);
  const editWorker = useServerFn(updateWorker);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: workersKey,
    queryFn: async () => (await fetchWorkers()) as unknown as WorkerRow[],
  });

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", password: "" });

  const [editing, setEditing] = useState<WorkerRow | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "" });

  const [resetting, setResetting] = useState<WorkerRow | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: workersKey });

  const create = useMutation({
    mutationFn: (input: { name: string; phone: string; password: string }) =>
      addWorker({ data: input }),
    onSuccess: (result) => {
      if (result && result.ok === false) {
        toast.error(result.message);
        return;
      }
      toast.success("Cleaner account created — they can log in now");
      setForm({ name: "", phone: "", password: "" });
      setAddOpen(false);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Could not create the account"),
  });

  const update = useMutation({
    mutationFn: (input: {
      id: string;
      name?: string;
      phone?: string;
      isActive?: boolean;
      password?: string;
    }) => editWorker({ data: input }),
    onSuccess: (result) => {
      if (result && result.ok === false) {
        toast.error(result.message);
        return;
      }
      toast.success("Saved");
      setEditing(null);
      setResetting(null);
      setNewPassword("");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Could not save the change"),
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Workers</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Create cleaner logins for the worker app, update details or deactivate staff.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm">
          <Plus className="size-4" />
          Add cleaner
        </Button>
      </div>

      <div className="mt-7 overflow-x-auto rounded-3xl border border-border bg-card shadow-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Cleaner</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Presence</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((worker) => (
                <tr key={worker.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3 font-bold">{worker.name}</td>
                  <td className="px-4 py-3 font-semibold">{worker.phone}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${
                        worker.is_online
                          ? "border-mint/30 bg-mint-soft text-mint"
                          : "border-border bg-muted text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          worker.is_online ? "bg-mint" : "bg-muted-foreground"
                        }`}
                      />
                      {worker.is_online ? "Online" : "Offline"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={worker.is_active}
                      onCheckedChange={(checked) =>
                        update.mutate({ id: worker.id, isActive: checked })
                      }
                      aria-label={`Toggle ${worker.name} active`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="soft"
                        size="sm"
                        onClick={() => {
                          setEditing(worker);
                          setEditForm({ name: worker.name, phone: worker.phone });
                        }}
                      >
                        <Pencil className="size-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setResetting(worker);
                          setNewPassword("");
                        }}
                      >
                        <KeyRound className="size-4" />
                        Password
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(data ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No cleaners yet — add your first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add cleaner */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-primary" />
              New cleaner account
            </DialogTitle>
            <DialogDescription>
              They sign in at /worker/login with this phone number and password.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              create.mutate(form);
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Ravi Kumar"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                inputMode="numeric"
                value={form.phone}
                onChange={(event) =>
                  setForm({ ...form, phone: event.target.value.replace(/\D/g, "").slice(0, 10) })
                }
                placeholder="9876543210"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder="At least 6 characters"
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending && <Loader2 className="size-4 animate-spin" />}
                Create account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit cleaner */}
      <Dialog open={editing != null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit cleaner</DialogTitle>
            <DialogDescription>Update the name or login phone number.</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!editing) return;
              update.mutate({ id: editing.id, name: editForm.name, phone: editForm.phone });
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="edit-name">Full name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-phone">Phone number</Label>
              <Input
                id="edit-phone"
                inputMode="numeric"
                value={editForm.phone}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    phone: event.target.value.replace(/\D/g, "").slice(0, 10),
                  })
                }
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending && <Loader2 className="size-4 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset password */}
      <Dialog open={resetting != null} onOpenChange={(open) => !open && setResetting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              {resetting ? `Set a new worker app password for ${resetting.name}.` : ""}
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!resetting) return;
              update.mutate({ id: resetting.id, password: newPassword });
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="At least 6 characters"
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending && <Loader2 className="size-4 animate-spin" />}
                Update password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
