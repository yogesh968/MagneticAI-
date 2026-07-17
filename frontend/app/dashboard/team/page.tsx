"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { UserPlus, Trash2, Shield, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { api, readSessionHint } from "@/lib/api";
import { Avatar, Badge, Card, Empty, Loading, PageHeader, Spinner } from "@/components/ui";

const ROLE_TONE: Record<string, string> = { admin: "blue", agent: "green", superadmin: "neutral" };
const ROLE_ICON: Record<string, React.ReactNode> = {
  admin: <ShieldCheck size={12} />,
  agent: <Shield size={12} />,
};

const inviteSchema = z.object({
  name: z.string().min(2, "Min 2 characters"),
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Min 8 characters"),
  role: z.enum(["admin", "agent"]),
});

export default function TeamPage() {
  const [members, setMembers] = useState<any[]>();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: "agent" },
  });

  const load = () =>
    api.get("/tickets/agents").then((r) => setMembers(r.data));

  useEffect(() => {
    load();
    setCurrentUser(readSessionHint());
  }, []);

  const invite = async (values: any) => {
    try {
      await api.post("/auth/invite", values);
      toast.success(`${values.name} has been added to your team`);
      reset({ role: "agent" });
      setShowForm(false);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Failed to add member");
    }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from the team?`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/auth/members/${id}`);
      toast.success(`${name} removed`);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Failed to remove member");
    } finally { setDeletingId(null); }
  };

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "superadmin";

  return (
    <div className="p-7">
      <PageHeader
        title="Team"
        subtitle="Manage team members and their roles"
        action={isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary gap-2">
            <UserPlus size={15} />
            {showForm ? "Cancel" : "Add member"}
          </button>
        )}
      />

      {/* Add member form */}
      {showForm && isAdmin && (
        <Card className="mb-5 anim-up">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sunken">
              <UserPlus size={15} className="text-ink" />
            </div>
            <p className="section-title">Add team member</p>
          </div>
          <form onSubmit={handleSubmit(invite)} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Full name</label>
              <input {...register("name")} placeholder="Jane Smith" className="input" />
              {errors.name && <p className="mt-1 text-xs text-red-600">{String(errors.name.message)}</p>}
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" {...register("email")} placeholder="jane@company.com" className="input" />
              {errors.email && <p className="mt-1 text-xs text-red-600">{String(errors.email.message)}</p>}
            </div>
            <div>
              <label className="label">Temporary password</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  {...register("password")}
                  placeholder="Min 8 characters"
                  className="input pr-10"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint">
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{String(errors.password.message)}</p>}
            </div>
            <div>
              <label className="label">Role</label>
              <select {...register("role")} className="input">
                <option value="agent">Agent — can handle tickets & conversations</option>
                <option value="admin">Admin — full platform access</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={isSubmitting} className="btn-primary gap-2">
                {isSubmitting ? <Spinner size={14} /> : <UserPlus size={14} />}
                {isSubmitting ? "Adding…" : "Add member"}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Members list */}
      <div className="rounded-2xl bg-white border border-hairline shadow-card overflow-hidden">
        {!members ? (
          <Loading rows={4} />
        ) : members.length === 0 ? (
          <Empty
            title="No team members yet"
            text="Add agents or admins to collaborate on tickets and conversations."
            icon={<UserPlus size={26} />}
          />
        ) : (
          <div className="divide-y divide-hairline">
            {members.map((m, i) => {
              const isMe = m._id === currentUser?.id;
              return (
                <div key={m._id} className={`flex items-center gap-4 px-5 py-4 anim-up d${Math.min(i + 1, 8)}`}>
                  <Avatar name={m.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-ink">{m.name}</p>
                      {isMe && <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-bold text-ink">YOU</span>}
                    </div>
                    <p className="text-sm text-ink-faint mt-0.5">{m.email}</p>
                  </div>
                  <Badge tone={ROLE_TONE[m.role] ?? "slate"}>
                    {ROLE_ICON[m.role]}
                    {m.role}
                  </Badge>
                  {isAdmin && !isMe && (
                    <button
                      onClick={() => remove(m._id, m.name)}
                      disabled={deletingId === m._id}
                      className="btn-ghost btn-sm p-2 text-ink-faint hover:text-red-600"
                      title="Remove member"
                    >
                      {deletingId === m._id ? <Spinner size={13} /> : <Trash2 size={14} />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Role guide */}
      <Card className="mt-5 anim-up d3">
        <p className="section-title mb-3">Role permissions</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { role: "Admin", color: "blue", perms: ["Manage knowledge base", "Configure AI & widget", "View all analytics", "Add / remove team members", "Handle all tickets"] },
            { role: "Agent", color: "green", perms: ["View & update tickets", "Handle conversations", "Human handoff (Socket.io)", "View basic analytics", "No platform config access"] },
          ].map(({ role, color, perms }) => (
            <div key={role} className={`rounded-xl border p-4 ${color === "blue" ? "border-hairline bg-sunken/40" : "border-green-100 bg-green-50/40"}`}>
              <div className="mb-3 flex items-center gap-2">
                <Badge tone={color}>{role}</Badge>
              </div>
              <ul className="space-y-1.5">
                {perms.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-xs text-ink-soft">
                    <span className={`h-1.5 w-1.5 rounded-full ${color === "blue" ? "bg-accent-500" : "bg-green-500"}`} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
