"use client";
import { useEffect, useState } from "react";
import { api, readSessionHint } from "@/lib/api";
import { Avatar, Badge, Empty, Loading, PageHeader } from "@/components/ui";
import { Users, Search, Shield, ShieldCheck, UserX } from "lucide-react";
import toast from "react-hot-toast";

const ROLE_TONE: Record<string, string> = { admin: "blue", agent: "green", superadmin: "purple" };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[] | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () =>
    api.get("/tickets/agents").then((r) => setUsers(r.data ?? [])).catch(() => toast.error("Failed to load users"));

  useEffect(() => {
    load();
    setCurrentUser(readSessionHint());
  }, []);

  const remove = async (id: string, name: string) => {
    if (!confirm(`Remove ${name}?`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/auth/members/${id}`);
      toast.success(`${name} removed`);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Failed to remove");
    } finally { setDeletingId(null); }
  };

  const filtered = (users ?? []).filter((u: any) => {
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="p-8">
      <PageHeader
        title="All Users"
        subtitle="Every user across the platform"
      />

      {/* Filter bar */}
      <div className="filter-bar mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            className="input pl-9 py-2"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="filter-divider" />
        {["", "admin", "agent", "superadmin"].map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              roleFilter === r ? "bg-violet-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            {r === "" ? "All" : r}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white border border-slate-200/60 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)] overflow-hidden anim-up d2">
        {!users ? (
          <Loading rows={6} />
        ) : filtered.length === 0 ? (
          <Empty
            title="No users found"
            text={search || roleFilter ? "Try different filters." : "No users registered yet."}
            icon={<Users size={26} />}
          />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Tenant ID</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u: any, i: number) => {
                  const isMe = u._id === currentUser?.id || u._id === currentUser?._id;
                  return (
                    <tr key={u._id} className={`anim-up d${Math.min(i + 1, 8)}`}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} size="sm" />
                          <div>
                            <p className="font-semibold text-slate-900">{u.name}</p>
                            {isMe && <span className="text-[10px] font-bold text-blue-600">YOU</span>}
                          </div>
                        </div>
                      </td>
                      <td className="text-sm text-slate-600">{u.email}</td>
                      <td>
                        <Badge tone={ROLE_TONE[u.role] ?? "slate"}>
                          {u.role === "admin" ? <ShieldCheck size={11} /> : u.role === "superadmin" ? <ShieldCheck size={11} /> : <Shield size={11} />}
                          {u.role}
                        </Badge>
                      </td>
                      <td>
                        <span className="font-mono text-xs text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                          {String(u.tenantId ?? "—").slice(0, 16)}…
                        </span>
                      </td>
                      <td>
                        {!isMe && u.role !== "superadmin" && (
                          <button
                            onClick={() => remove(u._id, u.name)}
                            disabled={deletingId === u._id}
                            className="btn-ghost btn-sm p-2 text-slate-300 hover:text-red-500"
                            title="Remove user"
                          >
                            {deletingId === u._id ? (
                              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : <UserX size={14} />}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {users && (
        <div className="mt-4 flex gap-3 flex-wrap anim-up d3">
          {[
            { label: "Total", value: users.length, color: "slate" },
            { label: "Admins", value: users.filter((u: any) => u.role === "admin").length, color: "blue" },
            { label: "Agents", value: users.filter((u: any) => u.role === "agent").length, color: "green" },
            { label: "Superadmins", value: users.filter((u: any) => u.role === "superadmin").length, color: "purple" },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-xl border px-4 py-2.5 text-sm font-semibold bg-${color}-50 border-${color}-100 text-${color}-700`}>
              {value} {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
