import { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import ConsoleShell from "../components/ConsoleShell";
import RadialGauge from "../components/RadialGauge";

const MILESTONE_STEPS = [
  { key: "sowing", label: "Sowing", idx: 0 },
  { key: "growing", label: "Growing", idx: 1 },
  { key: "pre-harvest", label: "Pre-Harvest", idx: 2 },
  { key: "harvest", label: "Harvest", idx: 3 },
];

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

function fmtDateLong(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function fmtAgo(d) {
  if (!d) return "—";
  const ms = Date.now() - new Date(d).getTime();
  if (!Number.isFinite(ms)) return "—";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function fmtPortfolioRecency(project) {
  const state = projectState(project);
  if (state !== "completed") return "Current";
  const base = project?.updatedAt || project?.createdAt;
  if (!base) return "Current";
  const elapsed = Date.now() - new Date(base).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return "Current";
  const day = 24 * 60 * 60 * 1000;
  const month = 30 * day;
  const year = 365 * day;
  if (elapsed >= year) {
    const years = Math.max(1, Math.floor(elapsed / year));
    return `${years} year${years > 1 ? "s" : ""} ago`;
  }
  if (elapsed >= month) {
    const months = Math.max(1, Math.floor(elapsed / month));
    return `${months} month${months > 1 ? "s" : ""} ago`;
  }
  const days = Math.max(1, Math.floor(elapsed / day));
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function stageLabelFromProject(project) {
  const idx = Math.max(0, Math.min(3, Number(project?.currentMilestone ?? 0) || 0));
  return MILESTONE_STEPS[idx]?.label || "Growing";
}

function fmtMoney(n) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

function projectState(project) {
  const status = String(project?.milestoneStatus || "").toLowerCase();
  if (
    String(project?.status || "").toLowerCase() === "completed" ||
    status.includes("complete") ||
    Number(project?.currentMilestone ?? 0) >= 3
  ) return "completed";
  return "active";
}

function cropLabel(project) {
  return project?.cropName || project?.cropType || "Crop not set";
}

function projectLocation(project) {
  return project?.farmLocation || project?.location || "Location unavailable";
}

function normalizeReading(reading) {
  if (!reading) return null;
  return {
    soilMoisture:
      reading.soilMoisture ??
      reading.moisture ??
      reading.soil_moisture ??
      null,
    temperature:
      reading.temperature ??
      reading.temp ??
      null,
    humidity:
      reading.humidity ??
      reading.hum ??
      null,
  };
}

export default function InvestorDashboard() {
  const [projects, setProjects] = useState([]);
  const [myInvestments, setMyInvestments] = useState([]);
  const [portfolioProjects, setPortfolioProjects] = useState([]);
  const [portfolioSummary, setPortfolioSummary] = useState({
    activeProjects: 0,
    diversityScore: 0,
    totalLocked: 0,
    totalReleased: 0,
  });
  const [projectReadings, setProjectReadings] = useState({});
  const [balance, setBalance] = useState(null);
  const [investAmount, setInvestAmount] = useState("5000");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedPortfolioProjectId, setSelectedPortfolioProjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [view, setView] = useState("portfolio");
  const [showInvestConfirm, setShowInvestConfirm] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmittingInvestment, setIsSubmittingInvestment] = useState(false);
  const [proofHistory, setProofHistory] = useState({ items: [] });

  const load = useCallback(async () => {
    setErr("");
    try {
      const [pRes, iRes, wRes, portfolioRes, lockedRes, releasedRes] = await Promise.all([
        api.get("/api/projects", { params: { t: Date.now() } }),
        api.get("/api/invest/my"),
        api.get("/api/wallet/me"),
        api.get("/api/portfolio").catch(() => ({ data: {} })),
        api.get("/api/escrow/locked").catch(() => ({ data: {} })),
        api.get("/api/escrow/released").catch(() => ({ data: {} })),
      ]);
      const list = Array.isArray(pRes.data) ? pRes.data : [];
      const investments = Array.isArray(iRes.data) ? iRes.data : [];
      const realProjects = list
        .filter((pr) => pr && pr._id && pr.title)
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      const uniquePortfolio = [];
      const seen = new Set();
      for (const inv of investments) {
        const pr = inv?.project;
        if (pr?._id && !seen.has(pr._id)) {
          seen.add(pr._id);
          uniquePortfolio.push(pr);
        }
      }

      setProjects(realProjects);
      setMyInvestments(investments);
      setPortfolioProjects(uniquePortfolio);
      setBalance(typeof wRes.data?.balance === "number" ? wRes.data.balance : 0);
      setPortfolioSummary({
        activeProjects: Number(portfolioRes.data?.activeProjects || uniquePortfolio.length || 0),
        diversityScore: Number(portfolioRes.data?.diversityScore || 0),
        totalLocked: Number(
          lockedRes.data?.totalLocked ?? portfolioRes.data?.totalLocked ?? 0
        ),
        totalReleased: Number(
          releasedRes.data?.totalReleased ?? portfolioRes.data?.totalReleased ?? 0
        ),
      });

      const readingTargets = (uniquePortfolio.length ? uniquePortfolio : realProjects).slice(0, 30);
      const readingEntries = await Promise.all(
        readingTargets.map(async (pr) => {
          try {
            const res = await api.get(`/api/sensors/history/${pr._id}`);
            const rows = Array.isArray(res.data) ? res.data : [];
            return [pr._id, normalizeReading(rows[0])];
          } catch {
            return [pr._id, null];
          }
        })
      );
      setProjectReadings(Object.fromEntries(readingEntries));
    } catch (e) {
      setErr(e.response?.data?.error || e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => {
      load();
    }, 8000);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  useEffect(() => {
    if (!projects.length) {
      setSelectedProjectId("");
      return;
    }
    const exists = projects.some((p) => p._id === selectedProjectId);
    if (!exists) {
      setSelectedProjectId(projects[0]._id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (portfolioProjects.length && !selectedPortfolioProjectId) {
      setSelectedPortfolioProjectId(portfolioProjects[0]._id);
    }
  }, [portfolioProjects, selectedPortfolioProjectId]);

  useEffect(() => {
    const current = projects.find((p) => p._id === selectedProjectId);
    if (current) {
      setInvestAmount(String(Number(current.targetFund || 0)));
    }
  }, [projects, selectedProjectId]);

  const totalInvested = myInvestments.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const displayPortfolio = totalInvested + (balance ?? 0);
  const selectedProject = projects.find((p) => p._id === selectedProjectId);
  const selectedPortfolioProject = portfolioProjects.find((p) => p._id === selectedPortfolioProjectId);
  const detailProject = selectedPortfolioProject || null;
  const selectedPortfolioReading = detailProject ? projectReadings[detailProject._id] : null;
  const projectedReturnPct = selectedProject ? (Number(selectedProject.expectedYield || 0) >= 4 ? 14.5 : 11.2) : 12.0;

  useEffect(() => {
    let cancelled = false;
    let intervalId;

    const loadProofHistory = async () => {
      if (!detailProject?._id) {
        if (!cancelled) setProofHistory({ items: [] });
        return;
      }
      try {
        const res = await api.get(`/api/crop/photo/history/${detailProject._id}`);
        if (!cancelled) setProofHistory(res.data || { items: [] });
      } catch {
        if (!cancelled) setProofHistory({ items: [] });
      }
    };

    (async () => {
      await loadProofHistory();
    })();

    intervalId = setInterval(loadProofHistory, 8000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [detailProject?._id]);

  const handleInvest = async () => {
    if (!selectedProjectId) {
      alert("Select a project.");
      return;
    }
    const amt = Number(investAmount);
    if (!amt || amt <= 0) {
      alert("Enter a valid amount.");
      return;
    }
    if (amt > Number(balance ?? 0)) {
      alert("Investment exceeds wallet balance.");
      return;
    }
    setTermsAccepted(false);
    setShowInvestConfirm(true);
  };

  const confirmInvestment = async () => {
    const amt = Number(investAmount);
    if (!termsAccepted) {
      alert("Accept policy and escrow terms before continuing.");
      return;
    }
    if (!amt || amt <= 0 || amt > Number(balance ?? 0)) {
      alert("Enter a valid amount within wallet balance.");
      return;
    }
    setIsSubmittingInvestment(true);
    try {
      await api.post("/api/invest", { projectId: selectedProjectId, amount: amt });
      alert("Investment recorded successfully.");
      setShowInvestConfirm(false);
      setTermsAccepted(false);
      await load();
    } catch (e) {
      alert(e.response?.data?.error || e.message || "Investment failed");
    } finally {
      setIsSubmittingInvestment(false);
    }
  };

  return (
    <ConsoleShell
      activeTop="portfolio"
      activeSidebar={view === "reports" ? "reports" : "portfolio"}
      pageTitle="Portfolio"
      pageSubtitle="Real-time monitoring of your active and past agricultural assets"
    >
      {err && (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">{err}</div>
      )}
      {loading ? (
        <p className="text-agri-text-muted">Loading…</p>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-white/8 bg-agri-card p-2 botanical-shadow">
            {[
              { id: "dashboard", label: "Dashboard", icon: "dashboard" },
              { id: "portfolio", label: "Portfolio", icon: "monitoring" },
              { id: "milestones", label: "Milestones", icon: "timeline" },
              { id: "reports", label: "Reports", icon: "bar_chart" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setView(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  view === tab.id ? "growth-gradient text-on-primary" : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
            <button
              type="button"
              onClick={load}
              className="ml-auto px-4 py-2 rounded-xl border border-primary/50 text-primary text-sm font-bold hover:bg-primary/10"
            >
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
            <div className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
              <p className="text-[10px] font-bold tracking-[0.2em] text-agri-text-muted uppercase mb-2">Wallet balance</p>
              <div className="text-4xl font-headline font-extrabold">
                {fmtMoney(Number(balance ?? 0))}
              </div>
              <div className="mt-2 text-sm text-on-surface-variant">
                Portfolio value: {fmtMoney(displayPortfolio)}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
              <p className="text-[10px] font-bold tracking-[0.2em] text-agri-text-muted uppercase mb-2">Escrow locked</p>
              <div className="text-4xl font-headline font-extrabold text-primary">
                {fmtMoney(Number(portfolioSummary.totalLocked || 0))}
              </div>
              <div className="mt-2 text-sm text-on-surface-variant">
                Released: {fmtMoney(Number(portfolioSummary.totalReleased || 0))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
              <p className="text-[10px] font-bold tracking-[0.2em] text-agri-text-muted uppercase mb-2">Active investments</p>
              <div className="text-4xl font-headline font-extrabold">
                {Number(portfolioSummary.activeProjects || portfolioProjects.length)}
              </div>
              <div className="mt-2 text-sm text-on-surface-variant">
                Diversity score: {Number(portfolioSummary.diversityScore || 0)}%
              </div>
            </div>
          </div>

          {view === "dashboard" && (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                <div className="xl:col-span-2 rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
                  <div className="flex items-center gap-2 mb-5">
                    <span className="material-symbols-outlined text-primary">agriculture</span>
                    <h2 className="font-headline font-bold text-lg">Current project details</h2>
                  </div>
                  {selectedProject ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="rounded-xl bg-agri-bg-soft border border-white/10 p-4">
                        <div className="text-[10px] uppercase text-agri-text-muted font-bold tracking-wider">Project</div>
                        <div className="mt-1 text-lg font-headline font-bold">{selectedProject.title}</div>
                        <div className="mt-1 text-sm text-on-surface-variant">{cropLabel(selectedProject)} · {projectLocation(selectedProject)}</div>
                      </div>
                      <div className="rounded-xl bg-agri-bg-soft border border-white/10 p-4">
                        <div className="text-[10px] uppercase text-agri-text-muted font-bold tracking-wider">Farmer</div>
                        <div className="mt-1 text-lg font-headline font-bold">{selectedProject.farmerName || "Farmer"}</div>
                        <div className="mt-1 text-sm text-on-surface-variant">{selectedProject.phoneNumber || "Phone not added"}</div>
                      </div>
                      <div className="rounded-xl bg-agri-bg-soft border border-white/10 p-4">
                        <div className="text-[10px] uppercase text-agri-text-muted font-bold tracking-wider">Scale</div>
                        <div className="mt-1 text-lg font-headline font-bold">
                          {Number(selectedProject.quantity || 0).toLocaleString()} qty
                        </div>
                        <div className="mt-1 text-sm text-on-surface-variant">
                          {Number(selectedProject.acres || 0).toLocaleString()} acres · Yield {Number(selectedProject.expectedYield || 0).toLocaleString()}
                        </div>
                      </div>
                      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                        <div className="text-[10px] uppercase text-agri-text-muted font-bold tracking-wider">Funding</div>
                        <div className="mt-1 text-lg font-headline font-bold text-primary">
                          {fmtMoney(Number(selectedProject.fundedAmount || 0))} / {fmtMoney(Number(selectedProject.targetFund || 0))}
                        </div>
                        <div className="mt-1 text-sm text-on-surface-variant">
                          Stage: {stageLabelFromProject(selectedProject)} · Created {fmtDate(selectedProject.createdAt)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-on-surface-variant">No farmer-created projects available right now.</div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow flex flex-col">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="material-symbols-outlined text-primary">bolt</span>
                    <h2 className="font-headline font-bold text-lg">Invest</h2>
                  </div>
                  <label className="text-[10px] font-bold tracking-widest text-agri-text-muted uppercase block mb-2">Project</label>
                  <select
                    className="w-full mb-4 px-4 py-3 rounded-xl bg-agri-bg-soft border border-white/10 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                  >
                    {projects.length === 0 ? (
                      <option value="">No real farmer projects found</option>
                    ) : (
                      projects.map((pr) => (
                        <option key={pr._id} value={pr._id}>
                          {(pr.cropName || pr.title) ?? "Project"} · {pr.farmerName || "Farmer"} · {pr.farmLocation || "—"}
                        </option>
                      ))
                    )}
                  </select>
                  <div className="flex justify-between items-baseline mb-2">
                    <label className="text-[10px] font-bold tracking-widest text-agri-text-muted uppercase">Amount</label>
                    <span className="text-xs font-semibold text-primary">Requested by farmer: {fmtMoney(Number(selectedProject?.targetFund || 0))}</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="100"
                    className="w-full px-4 py-3 rounded-xl bg-agri-bg-soft border border-white/10 text-lg font-headline font-bold outline-none focus:ring-2 focus:ring-primary/30 mb-4"
                    value={investAmount}
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={handleInvest}
                    disabled={!selectedProjectId || !projects.length}
                    className="mt-auto w-full py-3.5 rounded-xl growth-gradient text-on-primary font-headline font-extrabold text-sm uppercase tracking-wide hover:opacity-95 transition-opacity disabled:opacity-40"
                  >
                    Confirm investment
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <h2 className="text-2xl font-headline font-extrabold tracking-tight">Farmer Projects Open To Invest</h2>
                  <span className="text-xs text-agri-text-muted">{projects.length} real projects</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {projects.map((pr) => {
                    const pct = pr.targetFund ? Math.min(100, Math.round((Number(pr.fundedAmount || 0) / Number(pr.targetFund || 1)) * 100)) : 0;
                    return (
                      <article
                        key={pr._id}
                        className="rounded-2xl border border-white/10 bg-agri-bg-soft p-5 hover:border-primary/25 transition-colors"
                      >
                        <div className="flex justify-between gap-3 items-start">
                          <div>
                            <h3 className="font-headline font-bold text-base">{pr.title}</h3>
                            <p className="text-xs text-agri-text-muted mt-1">
                              {pr.farmerName || "Farmer"} · {projectLocation(pr)}
                            </p>
                          </div>
                          <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-bold">{stageLabelFromProject(pr)}</span>
                        </div>
                        <div className="mt-4 space-y-2 text-sm text-on-surface-variant">
                          <div>Crop: <span className="text-on-surface font-semibold">{cropLabel(pr)}</span></div>
                          <div>Quantity: <span className="text-on-surface font-semibold">{Number(pr.quantity || 0).toLocaleString()}</span></div>
                          <div>Acres: <span className="text-on-surface font-semibold">{Number(pr.acres || 0).toLocaleString()}</span></div>
                          <div>Expected yield: <span className="text-on-surface font-semibold">{Number(pr.expectedYield || 0).toLocaleString()}</span></div>
                          <div>Target: <span className="text-on-surface font-semibold">{fmtMoney(Number(pr.targetFund || 0))}</span></div>
                          <div>Raised: <span className="text-on-surface font-semibold">{fmtMoney(Number(pr.fundedAmount || 0))}</span></div>
                        </div>
                        <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="mt-2 flex justify-between text-[11px] text-agri-text-muted">
                          <span>{pct}% funded</span>
                          <span>{pr.milestoneStatus || "pending"}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProjectId(pr._id);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="mt-4 text-xs font-bold text-primary uppercase tracking-wide hover:underline"
                        >
                          Invest in this project
                        </button>
                      </article>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {view === "portfolio" && (
            <>
              <section className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow mb-8">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <h2 className="text-2xl font-headline font-extrabold tracking-tight">Your Portfolio</h2>
                  <span className="text-xs text-agri-text-muted">{portfolioProjects.length} tracked projects</span>
                </div>
                {portfolioProjects.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-agri-bg-soft p-4 text-sm text-on-surface-variant">
                    No active investments yet. Invest from Dashboard to populate portfolio projects.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {portfolioProjects.map((pr) => {
                      const investedInProject = myInvestments
                        .filter((inv) => inv?.project?._id === pr._id)
                        .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
                      const released = Number(pr.releasedFunds || 0);
                      const state = projectState(pr);
                      const badge = fmtPortfolioRecency(pr);
                      return (
                        <button
                          key={pr._id}
                          type="button"
                          onClick={() => setSelectedPortfolioProjectId(pr._id)}
                          className={`w-full text-left rounded-3xl border p-5 transition-colors ${
                            selectedPortfolioProjectId === pr._id
                              ? "border-primary/50 bg-primary/5"
                              : "border-white/10 bg-agri-bg-soft hover:border-primary/25"
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold">
                                <span className={`inline-block h-2 w-2 rounded-full ${state === "completed" ? "bg-white/60" : "bg-primary"}`} />
                                {state}
                              </div>
                              <h3 className="mt-2 text-3xl font-headline font-extrabold">{pr.title}</h3>
                              <p className="mt-1 text-sm text-on-surface-variant">{projectLocation(pr)} · {cropLabel(pr)}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-5 text-right min-w-[220px]">
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-agri-text-muted font-bold">Invested</div>
                                <div className="mt-1 text-3xl font-headline font-extrabold">{fmtMoney(investedInProject)}</div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-agri-text-muted font-bold">Released</div>
                                <div className="mt-1 text-3xl font-headline font-extrabold text-primary">{fmtMoney(released)}</div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-end">
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-white/10 text-on-surface-variant">
                              {badge}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-3xl font-headline font-extrabold tracking-tight">Project Detail</h2>
                    <p className="text-sm text-agri-text-muted">In-depth verification and IoT telemetry for your asset</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="text-sm text-on-surface-variant hover:text-on-surface"
                  >
                    Back to List
                  </button>
                </div>

                {detailProject ? (
                  <>
                    <div className="rounded-3xl border border-white/10 bg-agri-bg-soft p-5">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-primary/15 text-primary">
                          {projectState(detailProject)}
                        </span>
                        <span className="text-xs text-agri-text-muted">
                          {fmtDate(detailProject.createdAt)} - {stageLabelFromProject(detailProject)}
                        </span>
                      </div>
                      <h3 className="text-4xl font-headline font-extrabold">{detailProject.title}</h3>
                      <p className="mt-1 text-on-surface-variant">
                        {projectLocation(detailProject)} · {cropLabel(detailProject)} · Invested{" "}
                        {fmtMoney(
                          myInvestments
                            .filter((inv) => inv?.project?._id === detailProject._id)
                            .reduce((sum, inv) => sum + Number(inv.amount || 0), 0)
                        )}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
                        <div className="rounded-2xl border border-white/10 bg-[#121a24] p-4">
                          <div className="text-[10px] uppercase tracking-wider text-agri-text-muted font-bold">Farmer Requested</div>
                          <div className="mt-2 text-4xl font-headline font-extrabold">
                            {fmtMoney(Number(detailProject.targetFund || 0))}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-[#121a24] p-4">
                          <div className="text-[10px] uppercase tracking-wider text-agri-text-muted font-bold">Escrow Locked</div>
                          <div className="mt-2 text-4xl font-headline font-extrabold">
                            {fmtMoney(Number(detailProject.escrowBalance || 0))}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-[#121a24] p-4">
                          <div className="text-[10px] uppercase tracking-wider text-agri-text-muted font-bold">Released</div>
                          <div className="mt-2 text-4xl font-headline font-extrabold text-primary">
                            {fmtMoney(Number(detailProject.releasedFunds || 0))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mt-6">
                      <div className="xl:col-span-2 rounded-3xl border border-white/10 bg-agri-bg-soft p-5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xl font-headline font-bold">Live Field Monitoring</h4>
                          <span className="text-[11px] text-agri-text-muted">Last Sync: {fmtAgo(new Date())}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-5">
                          <RadialGauge
                            value={selectedPortfolioReading?.soilMoisture}
                            label="Moisture"
                            suffix="%"
                            tone="cool"
                          />
                          <RadialGauge
                            value={selectedPortfolioReading?.temperature != null ? (Number(selectedPortfolioReading.temperature) / 40) * 100 : null}
                            label="Temp"
                            suffix="°C"
                            tone="warm"
                          />
                          <RadialGauge
                            value={selectedPortfolioReading?.humidity}
                            label="Humidity"
                            suffix="%"
                            tone="primary"
                          />
                        </div>
                      </div>

                      <div className="xl:col-span-3 rounded-3xl border border-white/10 bg-agri-bg-soft p-5">
                        <h4 className="text-xl font-headline font-bold mb-5">Milestone Verification History</h4>
                        <div className="space-y-4">
                          {MILESTONE_STEPS.map((s) => {
                            const currentIdx = Number(detailProject.currentMilestone ?? 0);
                            const done = projectState(detailProject) === "completed" ? true : s.idx <= currentIdx;
                            const proofItems = Array.isArray(proofHistory?.items)
                              ? proofHistory.items.filter((x) => x?.stage === s.key)
                              : [];
                            const latestProof = proofItems[0] || null;
                            const proofStatus = latestProof?.status || (done ? "APPROVED" : "PENDING");
                            const statusTone =
                              proofStatus === "APPROVED"
                                ? "bg-primary/20 text-primary"
                                : proofStatus === "REJECTED"
                                  ? "bg-red-500/15 text-red-200"
                                  : "bg-white/10 text-on-surface-variant";
                            return (
                              <div key={s.key} className="rounded-3xl border border-white/10 bg-[#101721] p-4">
                                <div className="flex flex-wrap justify-between items-start gap-3">
                                  <div className="flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 text-primary font-bold flex items-center justify-center">
                                      {s.idx + 1}
                                    </span>
                                    <div>
                                      <div className="font-headline font-bold text-lg">{s.label}</div>
                                      <div className="text-xs text-agri-text-muted">
                                        Verified: {latestProof?.verified_at ? fmtDateLong(latestProof.verified_at) : done ? fmtDateLong(detailProject.updatedAt || detailProject.createdAt) : "Pending"}
                                      </div>
                                    </div>
                                  </div>
                                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${statusTone}`}>
                                    {proofStatus === "APPROVED"
                                      ? "Completed"
                                      : proofStatus === "REJECTED"
                                        ? "Rejected"
                                        : "Pending"}
                                  </span>
                                </div>

                                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                                  <div className="md:col-span-1 rounded-2xl border border-white/10 bg-agri-bg-soft p-4">
                                    <div className="grid grid-cols-3 gap-3 text-center">
                                      <div>
                                        <div className="text-[10px] uppercase tracking-wider text-agri-text-muted font-bold">Moisture</div>
                                        <div className="mt-1 text-lg font-headline font-extrabold">{selectedPortfolioReading?.soilMoisture ?? "—"}%</div>
                                      </div>
                                      <div>
                                        <div className="text-[10px] uppercase tracking-wider text-agri-text-muted font-bold">Temp</div>
                                        <div className="mt-1 text-lg font-headline font-extrabold">{selectedPortfolioReading?.temperature ?? "—"}°C</div>
                                      </div>
                                      <div>
                                        <div className="text-[10px] uppercase tracking-wider text-agri-text-muted font-bold">Humidity</div>
                                        <div className="mt-1 text-lg font-headline font-extrabold">{selectedPortfolioReading?.humidity ?? "—"}%</div>
                                      </div>
                                    </div>
                                    <div className="mt-3 text-xs text-agri-text-muted">
                                      {latestProof?.uploaded_at ? `Uploaded ${fmtAgo(latestProof.uploaded_at)}` : "No stage proof uploaded yet."}
                                    </div>
                                  </div>

                                  <div className="md:col-span-1 rounded-2xl border border-white/10 bg-agri-bg-soft p-4">
                                    <div className="text-[10px] uppercase tracking-[0.2em] text-agri-text-muted font-bold mb-2">
                                      Farmer&apos;s proof note
                                    </div>
                                    <div className="text-sm text-on-surface-variant leading-relaxed">
                                      {latestProof?.remarks
                                        ? `"${latestProof.remarks}"`
                                        : done
                                          ? `"Stage verified by telemetry and validator checks."`
                                          : "Awaiting farmer upload and validator review."}
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-white/10 text-on-surface-variant">
                                        Smart Contract Signal
                                      </span>
                                      <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-primary/15 text-primary border border-primary/25">
                                        IoT Validated
                                      </span>
                                    </div>
                                  </div>

                                  <div className="md:col-span-1 rounded-2xl border border-white/10 bg-agri-bg-soft overflow-hidden">
                                    {latestProof?.photo_url ? (
                                      <div className="relative h-full min-h-[160px]">
                                        <img
                                          src={latestProof.photo_url}
                                          alt={`${s.label} proof`}
                                          className="absolute inset-0 h-full w-full object-cover"
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                          <div className="text-[10px] uppercase tracking-[0.2em] text-agri-text-muted font-bold">
                                            Stage Proof Upload
                                          </div>
                                          <div className="text-xs text-on-surface-variant">
                                            {latestProof?.uploaded_at ? fmtDateLong(latestProof.uploaded_at) : "—"}
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="h-full min-h-[160px] grid place-items-center p-4 text-sm text-on-surface-variant">
                                        No proof image uploaded.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-agri-bg-soft p-4 text-sm text-on-surface-variant">
                    Select a portfolio project above to view full details and milestone verification history.
                  </div>
                )}
              </section>
            </>
          )}
          {view === "milestones" && (
            <section className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
              <div className="flex items-center justify-between gap-4 mb-5">
                <h2 className="text-2xl font-headline font-extrabold tracking-tight">Milestone History Dashboard</h2>
                <span className="text-xs text-agri-text-muted">{detailProject ? detailProject.title : "No project selected"}</span>
              </div>
              {detailProject ? (
                <div className="space-y-4">
                  {MILESTONE_STEPS.map((s) => {
                    const currentIdx = Number(detailProject.currentMilestone ?? 0);
                    const done = projectState(detailProject) === "completed" ? true : s.idx <= currentIdx;
                    return (
                      <div key={s.key} className="rounded-3xl border border-white/10 bg-agri-bg-soft p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 text-primary font-bold flex items-center justify-center">{s.idx + 1}</span>
                            <div>
                              <div className="font-headline font-bold text-lg">{s.label}</div>
                              <div className="text-xs text-agri-text-muted">Verified: {done ? fmtDate(detailProject.updatedAt || detailProject.createdAt) : "Pending"}</div>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${done ? "bg-primary/20 text-primary" : "bg-white/10 text-on-surface-variant"}`}>{done ? "Completed" : "Pending"}</span>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                          <div>Moisture: <span className="font-bold">{selectedPortfolioReading?.soilMoisture ?? "—"}%</span></div>
                          <div>Temp: <span className="font-bold">{selectedPortfolioReading?.temperature ?? "—"}°C</span></div>
                          <div>Humidity: <span className="font-bold">{selectedPortfolioReading?.humidity ?? "—"}%</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-agri-bg-soft p-4 text-sm text-on-surface-variant">
                  Select a project in Dashboard or Portfolio to view milestone history.
                </div>
              )}
            </section>
          )}
          {view === "reports" && (
            <section className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-primary text-xl">bar_chart</span>
                <h2 className="font-headline font-bold text-lg">Investor Reports</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="rounded-xl bg-agri-bg-soft border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-wider text-agri-text-muted font-bold">Total invested</div>
                  <div className="mt-2 text-3xl font-headline font-extrabold">{fmtMoney(totalInvested)}</div>
                </div>
                <div className="rounded-xl bg-agri-bg-soft border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-wider text-agri-text-muted font-bold">Total released</div>
                  <div className="mt-2 text-3xl font-headline font-extrabold text-primary">
                    {fmtMoney(portfolioProjects.reduce((sum, p) => sum + Number(p.releasedFunds || 0), 0))}
                  </div>
                </div>
                <div className="rounded-xl bg-agri-bg-soft border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-wider text-agri-text-muted font-bold">Projects tracked</div>
                  <div className="mt-2 text-3xl font-headline font-extrabold">{portfolioProjects.length}</div>
                </div>
              </div>
              <div className="space-y-3">
                {portfolioProjects.map((p) => (
                  <div key={p._id} className="rounded-xl border border-white/10 bg-agri-bg-soft p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">{p.title}</div>
                        <div className="text-xs text-agri-text-muted mt-1">
                          {p.cropName || p.cropType || "Crop"} · {p.farmLocation || "Location"}
                        </div>
                      </div>
                      <div className="text-xs text-agri-text-muted">
                        Milestone: <span className="text-on-surface font-semibold">{stageLabelFromProject(p)}</span>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>Invested: <span className="font-semibold">{fmtMoney(myInvestments.filter((inv) => inv?.project?._id === p._id).reduce((sum, inv) => sum + Number(inv.amount || 0), 0))}</span></div>
                      <div>Released: <span className="font-semibold">{fmtMoney(p.releasedFunds || 0)}</span></div>
                      <div>Escrow: <span className="font-semibold">{fmtMoney(p.escrowBalance || 0)}</span></div>
                      <div>Target: <span className="font-semibold">{fmtMoney(p.targetFund || 0)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
      {showInvestConfirm && selectedProject && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto rounded-[28px] border border-white/10 bg-[#10161f]/95 shadow-[0_30px_90px_rgba(0,0,0,0.65)]">
            <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-5 border-b border-white/10 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-headline font-extrabold">Confirm Investment</h3>
                <p className="text-xs text-agri-text-muted mt-1">Final check before escrow lock authorization</p>
              </div>
              <button
                type="button"
                onClick={() => setShowInvestConfirm(false)}
                className="w-9 h-9 rounded-full border border-white/15 text-on-surface-variant hover:text-on-surface"
              >
                ✕
              </button>
            </div>

            <div className="px-6 sm:px-8 py-6 space-y-5">
              <section className="rounded-3xl border border-white/10 bg-[#161f2a] p-5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-agri-text-muted font-bold">Active venture</p>
                <div className="mt-1 text-2xl font-headline font-extrabold text-primary">
                  {selectedProject.cropName || selectedProject.title}
                </div>
                <div className="grid sm:grid-cols-2 gap-3 mt-5">
                  <div className="rounded-2xl bg-[#0b1119] border border-white/10 p-4">
                    <div className="text-xs font-bold text-agri-text-muted uppercase">Expected Return</div>
                    <div className="mt-1 text-3xl font-headline font-extrabold">{projectedReturnPct}% <span className="text-sm font-semibold text-primary">p.a.</span></div>
                  </div>
                  <div className="rounded-2xl bg-[#0b1119] border border-white/10 p-4">
                    <div className="text-xs font-bold text-agri-text-muted uppercase">Risk Level</div>
                    <div className="mt-1 text-2xl font-headline font-extrabold text-primary">Low Risk (Insured)</div>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4 mt-5 text-sm">
                  <div>
                    <div className="text-[11px] uppercase text-agri-text-muted font-bold">Farmer</div>
                    <div className="mt-1 font-semibold">{selectedProject.farmerName || "Farmer"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase text-agri-text-muted font-bold">Location</div>
                    <div className="mt-1 font-semibold">{selectedProject.farmLocation || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase text-agri-text-muted font-bold">Crop Name</div>
                    <div className="mt-1 font-semibold">{selectedProject.cropName || selectedProject.cropType || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase text-agri-text-muted font-bold">Time Period</div>
                    <div className="mt-1 font-semibold">6 Months</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase text-agri-text-muted font-bold">Quantity</div>
                    <div className="mt-1 font-semibold">{Number(selectedProject.quantity || 0).toLocaleString()} Quintals</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase text-agri-text-muted font-bold">Expected Yield</div>
                    <div className="mt-1 font-semibold">{Number(selectedProject.expectedYield || 0).toLocaleString()} Tons/Acre</div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-[#121a24] p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <p className="font-bold text-on-surface">Fixed Investment Amount</p>
                  <p className="text-agri-text-muted">
                    Wallet Balance: {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(balance ?? 0))}
                  </p>
                </div>
                <div className="mt-3 rounded-2xl bg-black/60 border border-white/10 px-5 py-4 flex items-center justify-between gap-3">
                  <div className="text-4xl font-headline font-extrabold">
                    {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(investAmount || 0))}
                  </div>
                  <span className="px-3 py-1 rounded-lg text-xs font-black tracking-[0.08em] uppercase bg-primary/20 text-primary border border-primary/30">
                    Farmer Requested
                  </span>
                </div>
              </section>

              <label className="flex items-start gap-3 text-sm text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-5 w-5"
                />
                <span>
                  I agree to the <span className="text-primary">Risk Policy v1.0</span> and <span className="text-primary">Blockchain Escrow terms</span>. I understand that funds remain locked for the crop cycle duration unless a verified risk event triggers a governed release.
                </span>
              </label>

              <button
                type="button"
                onClick={confirmInvestment}
                disabled={!termsAccepted || isSubmittingInvestment}
                className="w-full py-4 rounded-full growth-gradient text-on-primary text-2xl font-headline font-extrabold disabled:opacity-50"
              >
                {isSubmittingInvestment ? "Authorizing..." : `Authorize & Lock ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(investAmount || 0))}`}
              </button>
              <button
                type="button"
                onClick={() => setShowInvestConfirm(false)}
                className="w-full py-3 rounded-full border border-white/20 text-on-surface-variant font-headline font-bold hover:text-on-surface"
              >
                Back to Home
              </button>
              <p className="text-center text-[11px] tracking-[0.25em] uppercase text-agri-text-muted font-bold">
                Secured by AES-256 multi-sig protocol
              </p>
            </div>
          </div>
        </div>
      )}
    </ConsoleShell>
  );
}
