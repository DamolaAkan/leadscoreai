"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthUser } from "@/lib/dashboard-types";
import ConfirmDialog from "./ConfirmDialog";

interface Member {
  id: string;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

interface UsersTabProps {
  user: AuthUser;
  accent: string;
  getAuthHeaders: () => Record<string, string>;
}

export default function UsersTab({
  user,
  accent,
  getAuthHeaders,
}: UsersTabProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("staff");
  const [addError, setAddError] = useState("");

  // Reset password
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const isSuperAdmin = user.role === "superadmin";

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/members", {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      setMembers(data.members || []);
    } catch {
      // Ignore
    }
    setLoading(false);
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");

    const res = await fetch("/api/dashboard/members", {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        username: newUsername,
        fullName: newFullName,
        password: newPassword,
        role: newRole,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setAddError(data.error || "Failed to create member");
      return;
    }

    setShowAdd(false);
    setNewUsername("");
    setNewFullName("");
    setNewPassword("");
    setNewRole("staff");
    fetchMembers();
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    await fetch(`/api/dashboard/members/${id}`, {
      method: "PUT",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !current }),
    });
    fetchMembers();
  };

  const handleResetPassword = async () => {
    if (!resetId || !resetPassword) return;
    await fetch(`/api/dashboard/members/${resetId}`, {
      method: "PUT",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: resetPassword }),
    });
    setResetId(null);
    setResetPassword("");
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/dashboard/members/${deleteId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    setDeleteId(null);
    fetchMembers();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: accent }}
        >
          {showAdd ? "Cancel" : "Add User"}
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="bg-white rounded-xl p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
              >
                <option value="staff">Staff</option>
                {isSuperAdmin && <option value="admin">Admin</option>}
              </select>
            </div>
          </div>
          {addError && (
            <p className="text-red-600 text-sm">{addError}</p>
          )}
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white rounded-lg"
            style={{ backgroundColor: accent }}
          >
            Create User
          </button>
        </form>
      )}

      {/* Members Table */}
      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">
          Loading members...
        </div>
      ) : (
        <div className="bg-white rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">
                    Username
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">
                    Role
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">
                    Last Login
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {m.full_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{m.username}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                        {m.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          m.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {m.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {m.last_login_at
                        ? new Date(m.last_login_at).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {m.id !== user.memberId && m.role !== "superadmin" && (
                        <>
                          <button
                            onClick={() =>
                              handleToggleActive(m.id, m.is_active)
                            }
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                          >
                            {m.is_active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => {
                              setResetId(m.id);
                              setResetPassword("");
                            }}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                          >
                            Reset PW
                          </button>
                          <button
                            onClick={() => setDeleteId(m.id)}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reset Password Dialog */}
      {resetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-900">Reset Password</h3>
            <input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="New password"
              className="w-full mt-4 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            />
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => setResetId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={!resetPassword}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                style={{ backgroundColor: accent }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
