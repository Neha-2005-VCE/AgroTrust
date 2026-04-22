import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import ConsoleShell from "../components/ConsoleShell";

function fmtMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState({ users: {}, projects: {}, totalInvested: 0 });
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [ovRes, uRes, pRes] = await Promise.all([
        api.get("/api/admin/overview"),
        api.get("/api/admin/users"),
        api.get("/api/admin/projects"),
      ]);
      setOverview(ovRes.data || { users: {}, projects: {}, totalInvested: 0 });
      setUsers(Array.isArray(uRes.data) ? uRes.data : []);
      setProjects(Array.isArray(pRes.data) ? pRes.data : []);
    } catch (e) {
      alert(e.response?.data?.error || e.message || "Failed to load admin dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateUserRole = async (id, role) => {
    try {
      await api.patch(`/api/admin/users/${id}`, { role });
      await load();
    } catch (e) {
      alert(e.response?.data?.error || e.message || "Could not update user role");
    }
  };

  const updateProjectStatus = async (id, status) => {
    try {
      await api.patch(`/api/admin/projects/${id}`, { status });
      await load();
    } catch (e) {
      alert(e.response?.data?.error || e.message || "Could not update project");
    }
  };

  const visibleUsers = users.filter(
    (u) => u.role !== "farmer" || u.verificationStatus === "approved"
  );

  return (
    <ConsoleShell
      activeTop="verification"
      activeSidebar="verification"
      pageTitle="Admin Control Center"
      pageSubtitle="Manage farmer, investor, buyer accounts and project lifecycle"
    >
      {loading ? (
        <p className="text-agri-text-muted">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
            <div className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
              <p className="text-[10px] uppercase tracking-[0.2em] text-agri-text-muted font-bold mb-2">Farmers</p>
              <div className="text-4xl font-headline font-extrabold">{Number(overview.users?.farmer || 0)}</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
              <p className="text-[10px] uppercase tracking-[0.2em] text-agri-text-muted font-bold mb-2">Investors</p>
              <div className="text-4xl font-headline font-extrabold">{Number(overview.users?.investor || 0)}</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
              <p className="text-[10px] uppercase tracking-[0.2em] text-agri-text-muted font-bold mb-2">Buyers</p>
              <div className="text-4xl font-headline font-extrabold">{Number(overview.users?.buyer || 0)}</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
              <p className="text-[10px] uppercase tracking-[0.2em] text-agri-text-muted font-bold mb-2">Total invested</p>
              <div className="text-4xl font-headline font-extrabold text-primary">
                {fmtMoney(overview.totalInvested || 0)}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-headline font-extrabold">User Control</h2>
              <Link to="/admin/verification" className="text-sm text-primary hover:underline">
                Open Verification Queue
              </Link>
            </div>
            <div className="space-y-3">
              {visibleUsers.map((u) => (
                <div key={u._id} className="rounded-xl border border-white/10 bg-agri-bg-soft p-4 flex flex-wrap gap-3 items-center">
                  <div className="min-w-[220px] flex-1">
                    <div className="font-semibold">{u.name}</div>
                    <div className="text-xs text-agri-text-muted">{u.email}</div>
                  </div>
                  <select
                    value={u.role}
                    onChange={(e) => updateUserRole(u._id, e.target.value)}
                    className="px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-sm"
                  >
                    <option value="farmer">farmer</option>
                    <option value="investor">investor</option>
                    <option value="buyer">buyer</option>
                    <option value="expert">expert</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
            <h2 className="text-xl font-headline font-extrabold mb-4">Project Control</h2>
            <div className="space-y-3">
              {projects.map((p) => (
                <div key={p._id} className="rounded-xl border border-white/10 bg-agri-bg-soft p-4 flex flex-wrap gap-3 items-center">
                  <div className="min-w-[240px] flex-1">
                    <div className="font-semibold">{p.title}</div>
                    <div className="text-xs text-agri-text-muted">
                      {p.farmerName || "Farmer"} · Funded {fmtMoney(p.fundedAmount || 0)}
                    </div>
                  </div>
                  <select
                    value={p.status}
                    onChange={(e) => updateProjectStatus(p._id, e.target.value)}
                    className="px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-sm"
                  >
                    <option value="active">active</option>
                    <option value="completed">completed</option>
                    <option value="failed">failed</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </ConsoleShell>
  );
}
