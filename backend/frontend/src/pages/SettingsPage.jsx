import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStoredUser } from "../services/api";
import ConsoleShell from "../components/ConsoleShell";

export default function SettingsPage() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyMarket, setNotifyMarket] = useState(true);

  return (
    <ConsoleShell
      activeTop="settings"
      activeSidebar="settings"
      pageTitle="Settings"
      pageSubtitle="Profile, notification, and account controls"
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
          <h2 className="text-lg font-headline font-bold mb-4">Profile</h2>
          <div className="space-y-3 text-sm">
            <div className="rounded-xl bg-agri-bg-soft border border-white/10 p-3">
              <div className="text-agri-text-muted text-xs uppercase tracking-wider">Name</div>
              <div className="font-semibold mt-1">{user?.name || "User"}</div>
            </div>
            <div className="rounded-xl bg-agri-bg-soft border border-white/10 p-3">
              <div className="text-agri-text-muted text-xs uppercase tracking-wider">Role</div>
              <div className="font-semibold mt-1">{String(user?.role || "user").toUpperCase()}</div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
          <h2 className="text-lg font-headline font-bold mb-4">Notifications</h2>
          <div className="space-y-3 text-sm">
            <label className="flex items-center justify-between rounded-xl bg-agri-bg-soft border border-white/10 p-3">
              <span>Email updates</span>
              <input type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} />
            </label>
            <label className="flex items-center justify-between rounded-xl bg-agri-bg-soft border border-white/10 p-3">
              <span>Marketplace alerts</span>
              <input type="checkbox" checked={notifyMarket} onChange={(e) => setNotifyMarket(e.target.checked)} />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow xl:col-span-2">
          <h2 className="text-lg font-headline font-bold mb-4">Account</h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-xl border border-white/20 text-sm hover:bg-white/5"
              onClick={() => alert("Password reset flow can be connected here.")}
            >
              Change Password
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-xl border border-red-400/40 text-red-200 text-sm hover:bg-red-400/10"
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                navigate("/login");
              }}
            >
              Sign Out
            </button>
          </div>
        </section>
      </div>
    </ConsoleShell>
  );
}
