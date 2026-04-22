import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { roleToApi, routeForRole, setAuthToken, setStoredUser } from "../services/api";

function authErrorMessage(err) {
  const apiErr = err.response?.data?.error;
  if (apiErr) return apiErr;
  if (err.code === "ERR_NETWORK" || err.message === "Network Error") {
    return "Cannot reach the API. Start the backend on port 5000 (same machine as this page).";
  }
  return err.message || "Request failed.";
}

export default function LoginPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Farmer");
  const [tab, setTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setBusy(true);
    try {
      const res = await api.post("/api/auth/login", { email: email.trim(), password });
      const { token, role: serverRole, name: serverName } = res.data;
      setAuthToken(token);
      setStoredUser({ name: serverName || email.split("@")[0], role: serverRole });
      navigate(routeForRole(serverRole));
    } catch (err) {
      alert(authErrorMessage(err) || "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      alert("Please enter your name.");
      return;
    }
    if (!String(password).trim() || String(password).length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/api/auth/register", {
        name: name.trim(),
        email: email.trim(),
        password,
        role: roleToApi(role),
      });
      alert("Account created. Sign in with your email and password.");
      setTab("login");
    } catch (err) {
      alert(authErrorMessage(err) || "Registration failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-agri-bg via-agri-bg-soft to-agri-bg text-on-surface font-body flex flex-col relative overflow-x-hidden">
      <div className="fixed top-[-10%] right-[-10%] w-[min(600px,90vw)] h-[min(600px,90vw)] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-emerald-900/15 rounded-full blur-[100px] pointer-events-none" />

      <main className="flex-1 w-full max-w-[1200px] mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center px-4 sm:px-8 py-12 relative z-10">
        <div className="hidden lg:flex flex-col space-y-10 pr-8">
          <div>
            <h1 className="text-5xl font-headline font-extrabold tracking-tight text-primary drop-shadow-sm">
              AgroTrust
            </h1>
            <p className="text-lg text-on-surface-variant mt-6 leading-relaxed max-w-md">
              Enter the digital greenhouse. Secure your stake in the future of sustainable agricultural growth.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-5 rounded-2xl border border-white/5 bg-agri-card/40 hover:border-primary/20 transition-colors">
              <div className="p-3 rounded-xl bg-primary/15 text-primary">
                <span className="material-symbols-outlined">monitoring</span>
              </div>
              <div>
                <h3 className="font-headline font-bold text-on-surface">Real-time Yield Data</h3>
                <p className="text-sm text-on-surface-variant mt-1">
                  Monitor IoT field sensors and growth milestones directly from your console.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-5 rounded-2xl border border-white/5 bg-agri-card/40 hover:border-primary/20 transition-colors">
              <div className="p-3 rounded-xl bg-primary/15 text-primary">
                <span className="material-symbols-outlined">shield</span>
              </div>
              <div>
                <h3 className="font-headline font-bold text-on-surface">Blockchain Security</h3>
                <p className="text-sm text-on-surface-variant mt-1">
                  Immutable ledger records for every seed funded and every harvest traded.
                </p>
              </div>
            </div>
          </div>
          <div className="inline-flex items-center gap-4 px-6 py-3 rounded-full bg-agri-card border border-white/10 max-w-full">
            <div className="flex -space-x-2 shrink-0">
              <img className="w-9 h-9 rounded-full border-2 border-agri-bg object-cover" alt="" src="https://randomuser.me/api/portraits/men/32.jpg" />
              <img className="w-9 h-9 rounded-full border-2 border-agri-bg object-cover" alt="" src="https://randomuser.me/api/portraits/women/44.jpg" />
              <img className="w-9 h-9 rounded-full border-2 border-agri-bg object-cover" alt="" src="https://randomuser.me/api/portraits/men/75.jpg" />
            </div>
            <span className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase leading-tight">
              +2.4k Farmers &amp; Investors Active Now
            </span>
          </div>
        </div>

        <div className="w-full flex justify-center">
          <div className="glass-panel botanical-shadow w-full max-w-[440px] p-8 sm:p-10 rounded-3xl border border-primary/10 flex flex-col gap-8">
            <div className="bg-agri-bg-soft p-1.5 rounded-2xl flex">
              <button
                type="button"
                onClick={() => setTab("login")}
                className={`flex-1 py-3 text-sm font-headline font-bold rounded-xl transition-all ${
                  tab === "login" ? "growth-gradient text-on-primary shadow-md" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setTab("register")}
                className={`flex-1 py-3 text-sm font-headline font-bold rounded-xl transition-all ${
                  tab === "register" ? "growth-gradient text-on-primary shadow-md" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Register
              </button>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-headline font-extrabold text-on-surface">
                {tab === "login" ? "Welcome back" : "Create account"}
              </h2>
              <p className="text-sm text-on-surface-variant mt-2">
                {tab === "login"
                  ? "Sign in to access your digital greenhouse dashboard."
                  : "Admin maps to Expert (milestone verification). Use a strong password."}
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold tracking-[0.2em] text-agri-text-muted uppercase block">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {["Farmer", "Investor", "Buyer", "Admin"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                      role === r
                        ? "border-primary bg-primary/10 text-primary scale-[1.02]"
                        : "border-white/10 bg-agri-bg-soft text-on-surface-variant hover:border-primary/40"
                    }`}
                    onClick={() => setRole(r)}
                  >
                    <span className="material-symbols-outlined text-2xl">
                      {r === "Farmer"
                        ? "agriculture"
                        : r === "Investor"
                          ? "account_balance"
                          : r === "Buyer"
                            ? "shopping_cart"
                            : "admin_panel_settings"}
                    </span>
                    <span className="text-[10px] font-bold mt-1.5 uppercase tracking-tight">{r}</span>
                  </button>
                ))}
              </div>
            </div>

            {tab === "register" && (
              <div>
                <label className="text-[10px] font-bold tracking-[0.2em] text-agri-text-muted uppercase block mb-2">
                  Full name
                </label>
                <input
                  className="w-full bg-agri-bg-soft border border-white/10 rounded-xl py-3 px-4 text-sm text-on-surface focus:ring-2 focus:ring-primary/30 outline-none"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-bold tracking-[0.2em] text-agri-text-muted uppercase block mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-agri-text-muted text-xl">
                    mail
                  </span>
                  <input
                    className="w-full bg-agri-bg-soft border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-on-surface focus:ring-2 focus:ring-primary/30 outline-none placeholder:text-agri-text-muted/50"
                    placeholder="name@company.com"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-bold tracking-[0.2em] text-agri-text-muted uppercase">
                    Password
                  </label>
                  <span className="text-[10px] font-bold text-primary/70 uppercase">min 6 chars</span>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-agri-text-muted text-xl">
                    lock
                  </span>
                  <input
                    className="w-full bg-agri-bg-soft border border-white/10 rounded-xl py-3 pl-11 pr-11 text-sm text-on-surface focus:ring-2 focus:ring-primary/30 outline-none"
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                    autoComplete={tab === "register" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-agri-text-muted hover:text-on-surface p-1"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={tab === "login" ? handleLogin : handleRegister}
              className="w-full py-3.5 rounded-xl growth-gradient text-on-primary font-headline font-extrabold text-base flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              {tab === "login" ? "Access Console" : "Create account"}
              <span className="material-symbols-outlined text-xl">arrow_forward</span>
            </button>

            <div className="relative flex items-center gap-4 py-1">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] font-bold tracking-widest text-agri-text-muted uppercase">Or continue with</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <button
              type="button"
              onClick={() => alert("Connect Google OAuth in production (not wired in this demo).")}
              className="w-full py-3 rounded-xl border border-white/15 bg-agri-bg-soft flex items-center justify-center gap-3 text-sm font-semibold hover:border-primary/30 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
          </div>
        </div>
      </main>

      <p className="text-center text-[10px] uppercase tracking-widest text-agri-text-muted pb-6 px-4 relative z-10">
        © 2024 AgroTrust The Digital Greenhouse. All rights reserved. ·{" "}
        <Link to="/" className="hover:text-primary">
          Home
        </Link>
      </p>
    </div>
  );
}
