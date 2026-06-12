"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge, Empty, Loading, PageHeader } from "@/components/ui";
import { Building2, Globe, Calendar, Hash } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<any[] | null>(null);
  const [users, setUsers] = useState<any[] | null>(null);

  useEffect(() => {
    // Load agents (which includes tenant info via the tickets/agents endpoint)
    // We use the analytics overview for tenant-level data
    Promise.all([
      api.get("/analytics/overview"),
      api.get("/tickets/agents"),
    ]).then(([, agentsRes]) => {
      setUsers(agentsRes.data ?? []);
    }).catch(() => toast.error("Could not load data"));

    // Build tenant info from the current user's token
    const stored = localStorage.getItem("user");
    if (stored) {
      const u = JSON.parse(stored);
      // Show the current tenant as a row
      setTenants([{
        _id: u.tenantId,
        name: "Current Tenant",
        slug: u.tenantId,
        createdAt: new Date().toISOString(),
        email: u.email,
      }]);
    }
  }, []);

  // Group users by tenant
  const usersByTenant = (users ?? []).reduce((acc: any, u: any) => {
    const tid = String(u.tenantId ?? "unknown");
    acc[tid] = (acc[tid] ?? []).concat(u);
    return acc;
  }, {});

  const tenantList = tenants ?? [];

  return (
    <div className="p-8">
      <PageHeader
        title="Tenants"
        subtitle="All registered tenants on the platform"
      />

      <div className="rounded-2xl bg-white border border-slate-200/60 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)] overflow-hidden anim-up">
        {!users ? (
          <Loading rows={5} />
        ) : (
          <>
            {/* Platform summary */}
            <div className="grid grid-cols-3 border-b border-slate-100">
              {[
                { label: "Total Members", value: users.length, icon: <Hash size={14} className="text-violet-500" /> },
                { label: "Admin Roles",   value: users.filter((u: any) => u.role === "admin").length, icon: <Building2 size={14} className="text-blue-500" /> },
                { label: "Agent Roles",   value: users.filter((u: any) => u.role === "agent").length, icon: <Globe size={14} className="text-emerald-500" /> },
              ].map(({ label, value, icon }) => (
                <div key={label} className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">{icon}</div>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Tenant card */}
            <div className="p-5 space-y-4">
              {tenantList.map((t: any) => {
                const tUsers = usersByTenant[String(t._id)] ?? users;
                return (
                  <div key={t._id} className="rounded-2xl border border-violet-100 bg-violet-50/30 p-5">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 border border-violet-200">
                          <Building2 size={18} className="text-violet-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{t.name}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{t._id}</p>
                        </div>
                      </div>
                      <Badge tone="purple">Active</Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-xs mb-4">
                      <div className="rounded-lg bg-white border border-slate-100 px-3 py-2.5">
                        <p className="text-slate-400 mb-0.5">Members</p>
                        <p className="font-bold text-slate-800 text-base">{tUsers.length}</p>
                      </div>
                      <div className="rounded-lg bg-white border border-slate-100 px-3 py-2.5">
                        <p className="text-slate-400 mb-0.5">Admins</p>
                        <p className="font-bold text-slate-800 text-base">{tUsers.filter((u: any) => u.role === "admin").length}</p>
                      </div>
                      <div className="rounded-lg bg-white border border-slate-100 px-3 py-2.5">
                        <p className="text-slate-400 mb-0.5">Agents</p>
                        <p className="font-bold text-slate-800 text-base">{tUsers.filter((u: any) => u.role === "agent").length}</p>
                      </div>
                    </div>

                    {/* Members list */}
                    <div className="space-y-2">
                      {tUsers.map((u: any) => (
                        <div key={u._id} className="flex items-center gap-3 rounded-xl bg-white border border-slate-100 px-4 py-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-bold text-white">
                            {u.name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{u.name}</p>
                            <p className="text-xs text-slate-400 truncate">{u.email}</p>
                          </div>
                          <Badge tone={u.role === "admin" ? "blue" : u.role === "superadmin" ? "purple" : "green"}>
                            {u.role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {tenantList.length === 0 && (
                <Empty
                  title="No tenants found"
                  text="Tenants are created when users register on the platform."
                  icon={<Building2 size={26} />}
                />
              )}
            </div>
          </>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700 anim-up d3">
        <strong>Note:</strong> Full multi-tenant management (create, suspend, delete tenants) requires a superadmin API endpoint. 
        This view shows the current tenant&apos;s data. Deploy with a superadmin seed to unlock cross-tenant visibility.
      </div>
    </div>
  );
}
