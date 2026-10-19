"use client";

import { useEffect, useState } from "react";
import { api, fmtDate } from "../_lib";

interface Member {
  id: string;
  username: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
}

export default function UsersView({ orgSlug }: { orgSlug: string }) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ members: Member[] }>(orgSlug, "/api/dashboard/members")
      .then((d) => setMembers(d.members))
      .catch(() => setError("Only admins can view the team."));
  }, [orgSlug]);

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
      <h3 className="text-[22px] font-bold">Team</h3>
      <p className="mt-1 text-[15px] text-gray-600">People who can sign in to this dashboard.</p>
      {error && <p className="mt-6 text-gray-500">{error}</p>}
      {members && (
        <table className="mt-6 w-full text-left text-[15px]">
          <thead>
            <tr className="text-[13px] text-gray-500">
              <th className="py-3 font-normal">Name</th>
              <th className="py-3 font-normal">Username</th>
              <th className="py-3 font-normal">Role</th>
              <th className="py-3 font-normal">Status</th>
              <th className="py-3 font-normal">Last sign-in</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-t border-gray-100">
                <td className="py-3">{m.full_name || "—"}</td>
                <td className="py-3 text-gray-700">{m.username}</td>
                <td className="py-3 capitalize text-gray-700">{m.role}</td>
                <td className="py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                    {m.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-3 text-gray-700">{fmtDate(m.last_login_at, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
