"use client";

import { useState } from "react";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "VIEWER";
  createdAt: Date | string;
};

const emptyForm = { name: "", email: "", password: "", role: "VIEWER" as "ADMIN" | "VIEWER" };

export default function UsersManager({
  initialUsers,
  currentUserId,
}: {
  initialUsers: AdminUser[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [rowError, setRowError] = useState<Record<string, string>>({});

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError("Name, email, and password are all required.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const created = await res.json();
      if (!res.ok) throw new Error(created.error);
      setUsers((u) => [...u, created]);
      setForm(emptyForm);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(id: string, role: "ADMIN" | "VIEWER") {
    setRowError((e) => ({ ...e, [id]: "" }));
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setRowError((e) => ({ ...e, [id]: data.error || "Failed to update role." }));
      return;
    }
    setUsers((u) => u.map((x) => (x.id === id ? data : x)));
  }

  async function submitReset(id: string) {
    if (resetPassword.length < 8) {
      setRowError((e) => ({ ...e, [id]: "Password must be at least 8 characters." }));
      return;
    }
    setRowError((e) => ({ ...e, [id]: "" }));
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: resetPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setRowError((e) => ({ ...e, [id]: data.error || "Failed to reset password." }));
      return;
    }
    setResetTargetId(null);
    setResetPassword("");
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this user account? They will no longer be able to sign in.")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setRowError((e) => ({ ...e, [id]: data.error || "Failed to delete." }));
      return;
    }
    setUsers((u) => u.filter((x) => x.id !== id));
  }

  return (
    <div className="mt-6">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        >
          {showForm ? "Close" : "+ Add user"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mt-4 grid gap-3 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-stone-600">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as "ADMIN" | "VIEWER" })}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="VIEWER">Viewer (read-only)</option>
              <option value="ADMIN">Admin (full access)</option>
            </select>
          </div>
          {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
          <div className="col-span-full">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {saving ? "Creating…" : "Create user"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-stone-100 last:border-0 align-top">
                <td className="px-4 py-3">
                  {u.name}
                  {u.id === currentUserId && <span className="ml-2 text-xs text-stone-400">(you)</span>}
                </td>
                <td className="px-4 py-3 text-stone-500">{u.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u.id, e.target.value as "ADMIN" | "VIEWER")}
                    className="rounded-lg border border-stone-300 px-2 py-1 text-sm"
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-stone-500">
                  {new Date(u.createdAt).toLocaleDateString("en-IN")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-2 text-xs">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setResetTargetId(resetTargetId === u.id ? null : u.id);
                          setResetPassword("");
                        }}
                        className="text-teal-700 hover:underline"
                      >
                        Reset password
                      </button>
                      {u.id !== currentUserId && (
                        <button onClick={() => handleDelete(u.id)} className="text-red-600 hover:underline">
                          Delete
                        </button>
                      )}
                    </div>
                    {resetTargetId === u.id && (
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          placeholder="New password"
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                          className="w-36 rounded-lg border border-stone-300 px-2 py-1 text-sm focus:border-teal-600 focus:outline-none"
                        />
                        <button
                          onClick={() => submitReset(u.id)}
                          className="rounded-lg bg-teal-700 px-2 py-1 text-xs font-semibold text-white hover:bg-teal-800"
                        >
                          Save
                        </button>
                      </div>
                    )}
                    {rowError[u.id] && <p className="text-red-600">{rowError[u.id]}</p>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
