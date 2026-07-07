import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react";

import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import {
  createAdminAccount,
  deleteAdminAccount,
  getAdminAccounts,
  updateAdminAccount,
} from "../../lib/api";

const ROLES = ["owner", "admin", "support", "viewer"];

function formatDate(value) {
  const date = new Date(value || "");

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function roleLabel(role) {
  return String(role || "viewer").replace(/^./, (value) => value.toUpperCase());
}

export default function AdminAccessControlTab({
  currentAdmin,
  refreshKey = 0,
  onChanged,
}) {
  const [accounts, setAccounts] = useState([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getAdminAccounts();
      setAccounts(Array.isArray(response.items) ? response.items : []);
    } catch (requestError) {
      setError(requestError.message || "Could not load admin accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    // refreshKey intentionally allows the parent Refresh action to reload this tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const notifyChanged = async () => {
    await loadAccounts();
    await onChanged?.();
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    const targetEmail = email.trim().toLowerCase();

    if (!targetEmail) {
      setError("Enter the email address of an existing Firebase user.");
      return;
    }

    setActionLoading("create");
    setError("");
    setSuccess("");

    try {
      const response = await createAdminAccount({ targetEmail, role });
      setEmail("");
      setRole("admin");
      setSuccess(
        response?.before
          ? "Admin access was updated and activated."
          : "Admin access was granted successfully."
      );
      await notifyChanged();
    } catch (requestError) {
      setError(requestError.message || "Could not grant admin access.");
    } finally {
      setActionLoading("");
    }
  };

  const handleRoleChange = async (account, nextRole) => {
    if (nextRole === account.role) return;

    const confirmed = window.confirm(
      `Change ${account.email || "this user"} to ${roleLabel(nextRole)}?`
    );

    if (!confirmed) return;

    setActionLoading(`role:${account.id}`);
    setError("");
    setSuccess("");

    try {
      await updateAdminAccount(account.id, { role: nextRole });
      setSuccess("Admin role updated.");
      await notifyChanged();
    } catch (requestError) {
      setError(requestError.message || "Could not update admin role.");
    } finally {
      setActionLoading("");
    }
  };

  const handleStatus = async (account) => {
    const nextIsActive = !account.isActive;
    const confirmed = window.confirm(
      nextIsActive
        ? `Reactivate admin access for ${account.email || "this user"}?`
        : `Deactivate admin access for ${account.email || "this user"}? They will keep their normal user account.`
    );

    if (!confirmed) return;

    setActionLoading(`status:${account.id}`);
    setError("");
    setSuccess("");

    try {
      await updateAdminAccount(account.id, { isActive: nextIsActive });
      setSuccess(nextIsActive ? "Admin access reactivated." : "Admin access deactivated.");
      await notifyChanged();
    } catch (requestError) {
      setError(requestError.message || "Could not update admin access.");
    } finally {
      setActionLoading("");
    }
  };

  const handleDelete = async (account) => {
    const confirmed = window.confirm(
      `Remove admin access for ${account.email || "this user"}?\n\nTheir Firebase login and normal user data will NOT be deleted.`
    );

    if (!confirmed) return;

    setActionLoading(`delete:${account.id}`);
    setError("");
    setSuccess("");

    try {
      await deleteAdminAccount(account.id);
      setSuccess("Admin access was removed. The Firebase user account remains unchanged.");
      await notifyChanged();
    } catch (requestError) {
      setError(requestError.message || "Could not remove admin access.");
    } finally {
      setActionLoading("");
    }
  };

  return (
    <Card className="border-white/10 bg-white/[0.04]">
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
              <ShieldCheck className="h-3.5 w-3.5" />
              Owner-only access control
            </div>
            <h2 className="mt-3 text-lg font-semibold text-white">Admin access</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-500">
              Add an already-registered Firebase user by email, change their role, deactivate access, or remove only their admin role. Removing access never deletes the user’s Firebase account or product data.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="grid gap-3 border-b border-white/10 p-5 lg:grid-cols-[minmax(0,1fr)_180px_auto]">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Existing Firebase user email"
            className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300/40"
            required
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="h-11 rounded-2xl border border-white/10 bg-[#10131c] px-4 text-sm text-white outline-none"
          >
            {ROLES.map((item) => (
              <option key={item} value={item}>
                {roleLabel(item)}
              </option>
            ))}
          </select>
          <Button
            type="submit"
            disabled={actionLoading === "create"}
            className="h-11 rounded-2xl bg-cyan-300 px-5 text-sm font-semibold text-black hover:bg-cyan-200 disabled:opacity-50"
          >
            {actionLoading === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Add access
          </Button>
        </form>

        {error && (
          <div className="mx-5 mt-5 flex gap-3 rounded-2xl border border-red-300/20 bg-red-500/10 p-4 text-sm text-red-100">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="mx-5 mt-5 flex gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-100">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{success}</p>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
            Loading admin access…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-[0.14em] text-zinc-500">
                <tr>
                  <th className="px-5 py-4 font-medium">Admin</th>
                  <th className="px-5 py-4 font-medium">Role</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Added</th>
                  <th className="px-5 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {accounts.map((account) => {
                  const isSelf = Boolean(
                    account.userId && currentAdmin?.userId && account.userId === currentAdmin.userId
                  );
                  const roleSaving = actionLoading === `role:${account.id}`;
                  const statusSaving = actionLoading === `status:${account.id}`;
                  const deleting = actionLoading === `delete:${account.id}`;

                  return (
                    <tr key={account.id} className="transition hover:bg-white/[0.035]">
                      <td className="px-5 py-4">
                        <p className="max-w-72 truncate font-medium text-white">
                          {account.email || "No email"}
                          {isSelf ? " (you)" : ""}
                        </p>
                        {/* <p className="mt-1 max-w-72 truncate text-xs text-zinc-500">
                          {account.userId || "Awaiting first Firebase login"}
                        </p> */}
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={account.role}
                          disabled={isSelf || roleSaving || statusSaving || deleting}
                          onChange={(event) => handleRoleChange(account, event.target.value)}
                          className="h-9 min-w-32 rounded-xl border border-white/10 bg-[#10131c] px-3 text-xs text-white outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {ROLES.map((item) => (
                            <option key={item} value={item}>
                              {roleLabel(item)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${account.isActive
                          ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
                          : "border-red-300/20 bg-red-500/10 text-red-200"
                          }`}>
                          {account.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-zinc-500">{formatDate(account.createdAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            disabled={isSelf || roleSaving || statusSaving || deleting}
                            onClick={() => handleStatus(account)}
                            className="h-8 rounded-full border border-white/10 bg-white/[0.05] px-3 text-xs text-zinc-100 hover:bg-white/[0.1] disabled:opacity-50"
                          >
                            {statusSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : account.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            type="button"
                            disabled={isSelf || roleSaving || statusSaving || deleting}
                            onClick={() => handleDelete(account)}
                            className="h-8 rounded-full border border-red-300/20 bg-red-500/10 px-3 text-xs text-red-100 hover:bg-red-500/20 disabled:opacity-50"
                          >
                            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            Remove access
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!accounts.length && (
              <div className="p-8 text-center text-sm text-zinc-500">No admin accounts found.</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
