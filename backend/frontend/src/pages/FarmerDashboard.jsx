import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import ConsoleShell from "../components/ConsoleShell";
import IoTReadings from '../components/IoTReadings';

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

function timeAgoLabel(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  const diffMs = Date.now() - dt.getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days < 1) return "Current";
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

function fmtMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function MetricRow({ label, value, sub, pct, barClass = "bg-primary" }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline gap-2">
        <span className="text-xs text-agri-text-muted uppercase tracking-wider">{label}</span>
        <div className="text-right">
          <span className="text-lg font-bold font-headline">{value}</span>
          {sub && <span className="text-xs text-primary ml-2">{sub}</span>}
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const STAGES = [
  { value: "sowing", label: "Sowing" },
  { value: "growing", label: "Growing" },
  { value: "pre-harvest", label: "Pre-harvest" },
  { value: "harvest", label: "Harvest" },
];

const STAGE_ORDER = ["sowing", "growing", "pre-harvest", "harvest"];

const MILESTONE_STEPS = [
  { idx: 0, key: "sowing", label: "Sowing" },
  { idx: 1, key: "growing", label: "Growing" },
  { idx: 2, key: "pre-harvest", label: "Pre-harvest" },
  { idx: 3, key: "harvest", label: "Harvest" },
];

export default function FarmerDashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [investments, setInvestments] = useState([]);
  const [investmentId, setInvestmentId] = useState("");
  const [stage, setStage] = useState("sowing");
  const [readings, setReadings] = useState([]);
  const [escrow, setEscrow] = useState(null);
  const [latestProof, setLatestProof] = useState(null);
  const [latestProofByStage, setLatestProofByStage] = useState({});
  const [harvestReconcileDone, setHarvestReconcileDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [view, setView] = useState("dashboard"); // dashboard | portfolio | projects | milestones | reports
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    farmerName: "",
    farmLocation: "",
    phoneNumber: "",
    cropName: "",
    quantity: "",
    acres: "",
    expectedYield: "",
    targetFund: "50000",
  });

  const buildLatestProofByStage = useCallback((items) => {
    const map = {};
    (Array.isArray(items) ? items : []).forEach((item) => {
      const stageKey = String(item?.stage || "").toLowerCase();
      if (!stageKey) return;
      if (!map[stageKey]) map[stageKey] = item;
    });
    return map;
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const res = await api.get("/api/projects/farmer/mine");
      const list = Array.isArray(res.data) ? res.data : [];
      setProjects(list);
    } catch (e) {
      const apiErr = e.response?.data?.error || "Could not load your projects.";
      if (e.response?.status === 403) {
        const lower = String(apiErr).toLowerCase();
        if (
          lower.includes("rejected") ||
          lower.includes("hold") ||
          lower.includes("pending verification")
        ) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          alert(apiErr);
          navigate("/login", { replace: true });
          return;
        }
      }
      setMsg(apiErr);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (projects.length && !projectId) {
      setProjectId(projects[0]._id);
    }
  }, [projects, projectId]);

  useEffect(() => {
    if (!projectId) return;
    setInvestmentId("");
    let cancelled = false;
    (async () => {
      try {
        const [invRes, histRes, escRes, proofRes] = await Promise.all([
          api.get(`/api/projects/${projectId}/investments`),
          api.get(`/api/sensors/history/${projectId}`),
          api.get(`/api/escrow/${projectId}`).catch(() => ({ data: null })),
          api.get(`/api/crop/photo/history/${projectId}`).catch(() => ({ data: { items: [] } })),
        ]);
        if (cancelled) return;
        const invs = Array.isArray(invRes.data) ? invRes.data : [];
        setInvestments(invs);
        if (invs.length) {
          setInvestmentId(invs[0]._id);
        } else {
          setInvestmentId("");
        }
        setReadings(Array.isArray(histRes.data) ? histRes.data : []);
        setEscrow(escRes.data || null);
        const proofItems = Array.isArray(proofRes?.data?.items) ? proofRes.data.items : [];
        setLatestProof(proofItems.length ? proofItems[0] : null);
        setLatestProofByStage(buildLatestProofByStage(proofItems));
      } catch (e) {
        if (!cancelled) setMsg(e.response?.data?.error || "Failed to load project data.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    let active = true;

    const syncSelectedProject = async () => {
      try {
        const [projectRes, proofRes] = await Promise.all([
          api.get(`/api/projects/${projectId}`),
          api.get(`/api/crop/photo/history/${projectId}`).catch(() => ({ data: { items: [] } })),
        ]);
        const fresh = projectRes.data;
        if (!active || !fresh?._id) return;

        const items = Array.isArray(proofRes?.data?.items) ? proofRes.data.items : [];
        setLatestProof(items.length ? items[0] : null);
        setLatestProofByStage(buildLatestProofByStage(items));

        setProjects((prev) => {
          const next = Array.isArray(prev) ? [...prev] : [];
          const idx = next.findIndex((p) => p._id === fresh._id);
          if (idx >= 0) next[idx] = { ...next[idx], ...fresh };
          return next;
        });
      } catch (_err) {
        // Keep the current UI state if periodic sync fails.
      }
    };

    syncSelectedProject();
    const intervalId = setInterval(syncSelectedProject, 10000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [projectId, buildLatestProofByStage]);

  useEffect(() => {
    if (!projectId || harvestReconcileDone) return;

    const harvestProof = latestProofByStage.harvest;
    const harvestApproved = String(harvestProof?.status || "").toUpperCase() === "APPROVED";
    const hasLockedFunds = Number(escrow?.totalLocked || 0) > 0;
    if (!harvestApproved || !hasLockedFunds) return;

    let active = true;
    (async () => {
      try {
        await api.post("/api/mgs/release-harvest", { projectId });
        if (!active) return;
        setHarvestReconcileDone(true);
        await loadProjects();
        const [freshProjectRes, freshEscrowRes] = await Promise.all([
          api.get(`/api/projects/${projectId}`),
          api.get(`/api/escrow/${projectId}`).catch(() => ({ data: null })),
        ]);
        const freshProject = freshProjectRes?.data;
        if (freshProject?._id) {
          setProjects((prev) =>
            Array.isArray(prev) ? prev.map((p) => (p._id === freshProject._id ? { ...p, ...freshProject } : p)) : prev
          );
        }
        setEscrow(freshEscrowRes.data || null);
      } catch (_err) {
        if (active) setHarvestReconcileDone(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [projectId, latestProofByStage, escrow, harvestReconcileDone, loadProjects]);

  const latest = readings[0];
  const soil = latest?.soilMoisture ?? 64;
  const temp = latest?.temperature ?? 24;
  const hum = latest?.humidity ?? 52;

  const simulateReading = async () => {
    if (!projectId || !investmentId) {
      alert("Select a project that has at least one investment (investors must fund it first).");
      return;
    }
    try {
      await api.post("/api/sensors/simulate", { projectId, investmentId });
      const histRes = await api.get(`/api/sensors/history/${projectId}`);
      setReadings(Array.isArray(histRes.data) ? histRes.data : []);
      setMsg("New IoT reading simulated.");
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    }
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !projectId || !investmentId) {
      alert("Choose project, investment, and a photo file.");
      return;
    }
    const milestoneIdxRaw = Number(selectedProject?.currentMilestone ?? 0);
    const milestoneIdx = Number.isFinite(milestoneIdxRaw) ? Math.max(0, Math.min(3, milestoneIdxRaw)) : 0;
    const expectedStageValue = STAGE_ORDER[milestoneIdx] || "sowing";
    const normalizedStage = String(stage).toLowerCase();
    if (normalizedStage !== expectedStageValue) {
      alert(`Please upload proof for the current stage: ${expectedStageValue}`);
      e.target.value = "";
      return;
    }

    const fd = new FormData();
    fd.append("photo", file);
    fd.append("farm_id", projectId);
    fd.append("investment_id", investmentId);
    fd.append("stage", expectedStageValue);
    try {
      const uploadRes = await api.post("/api/crop/photo/upload", fd);
      const uploadedProof = {
        stage: expectedStageValue,
        status: String(uploadRes?.data?.status || "PENDING").toUpperCase(),
        uploaded_at: new Date().toISOString(),
      };
      setLatestProof(uploadedProof);
      setLatestProofByStage((prev) => ({ ...prev, [expectedStageValue]: uploadedProof }));
      setProjects((prev) =>
        Array.isArray(prev)
          ? prev.map((p) => (p._id === projectId ? { ...p, milestoneStatus: "proof_submitted" } : p))
          : prev
      );
      alert("Photo uploaded for expert review.");
      setMsg(`Photo uploaded for ${expectedStageValue} stage and submitted for verification.`);
    } catch (err) {
      alert(err.response?.data?.error || err.message || "Upload failed (check Cloudinary env on server).");
    }
    e.target.value = "";
  };

  const createProject = async () => {
    if (!form.farmerName.trim()) return alert("Enter farmer name.");
    if (!form.farmLocation.trim()) return alert("Enter farm location.");
    if (!form.phoneNumber.trim()) return alert("Enter phone number.");
    if (!form.cropName.trim()) return alert("Enter crop name.");
    if (!String(form.targetFund).trim()) return alert("Enter target fund.");

    const title = `Farm Project · ${form.cropName.trim()} · ${form.farmLocation.trim()}`;

    setCreating(true);
    try {
      await api.post("/api/projects", {
        title,
        targetFund: Number(form.targetFund) || 10000,
        description: `Farmer: ${form.farmerName.trim()} · Phone: ${form.phoneNumber.trim()} · Location: ${form.farmLocation.trim()}`,
        cropType: form.cropName.trim(),
        farmerName: form.farmerName.trim(),
        farmLocation: form.farmLocation.trim(),
        phoneNumber: form.phoneNumber.trim(),
        cropName: form.cropName.trim(),
        quantity: Number(form.quantity) || 0,
        acres: Number(form.acres) || 0,
        expectedYield: Number(form.expectedYield) || 0,
      });
      setMsg("Project created.");
      await loadProjects();
      setCreateOpen(false);
      setForm({
        farmerName: "",
        farmLocation: "",
        phoneNumber: "",
        cropName: "",
        quantity: "",
        acres: "",
        expectedYield: "",
        targetFund: "50000",
      });
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setCreating(false);
    }
  };

  const selectedProject = projects.find((p) => p._id === projectId);
  const milestoneIdxRaw = Number(selectedProject?.currentMilestone ?? 0);
  const milestoneIdx = Number.isFinite(milestoneIdxRaw) ? Math.max(0, Math.min(3, milestoneIdxRaw)) : 0;
  const currentStageLabel = MILESTONE_STEPS.find((s) => s.idx === milestoneIdx)?.label || "Growing";
  const expectedStageValue = STAGE_ORDER[milestoneIdx] || "sowing";
  const isCompleted = String(selectedProject?.status || "").toLowerCase() === "completed";

  useEffect(() => {
    setStage(expectedStageValue);
  }, [expectedStageValue, projectId]);

  const selectedStageProof = latestProofByStage[String(stage).toLowerCase()] || null;
  const selectedStageProofStatus = String(selectedStageProof?.status || "").toUpperCase();
  const selectedStageProofLabel =
    selectedStageProofStatus === "PENDING"
      ? "Photo uploaded and submitted for verification"
      : selectedStageProofStatus === "APPROVED"
        ? "Photo approved"
        : selectedStageProofStatus === "REJECTED"
          ? "Photo rejected"
          : "No photo uploaded for this stage yet";

  return (
    <ConsoleShell
      activeTop="console"
      activeSidebar={view === "portfolio" ? "portfolio" : view}
      pageTitle={selectedProject?.title || "Field Console"}
      pageTitleAccent=""
      pageSubtitle="Current project, milestones, IoT readings, escrow, and uploads"
    >
      {msg && (
        <div className="mb-4 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary">{msg}</div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-white/8 bg-agri-card p-2 botanical-shadow">
        {[
          { id: "dashboard", label: "Dashboard", icon: "dashboard" },
          { id: "portfolio", label: "Portfolio", icon: "monitoring" },
          { id: "projects", label: "Projects", icon: "inventory_2" },
          { id: "milestones", label: "Milestones", icon: "timeline" },
          { id: "reports", label: "Reports", icon: "bar_chart" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setView(t.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              view === t.id ? "growth-gradient text-on-primary" : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/50 text-primary text-sm font-bold hover:bg-primary/10"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create project
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-8">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase text-agri-text-muted font-bold">Your project</label>
          <select
            className="px-4 py-2 rounded-xl bg-agri-bg-soft border border-white/10 text-sm min-w-[200px]"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            {loading ? (
              <option>Loading…</option>
            ) : projects.length === 0 ? (
              <option value="">No projects — use API POST /api/projects</option>
            ) : (
              projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.title}
                </option>
              ))
            )}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase text-agri-text-muted font-bold">Investment (for IoT / photo)</label>
          <select
            className="px-4 py-2 rounded-xl bg-agri-bg-soft border border-white/10 text-sm min-w-[200px]"
            value={investmentId}
            onChange={(e) => setInvestmentId(e.target.value)}
            disabled={!investments.length}
          >
            {!investments.length ? (
              <option value="">No investments yet</option>
            ) : (
              investments.map((i) => (
                <option key={i._id} value={i._id}>
                  {fmtMoney(i.amount)} · {i._id.slice(-6)}
                </option>
              ))
            )}
          </select>
        </div>
        <button
          type="button"
          onClick={simulateReading}
          className="self-end px-4 py-2 rounded-xl growth-gradient text-on-primary text-sm font-bold"
        >
          Simulate IoT reading
        </button>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => (!creating ? setCreateOpen(false) : null)}
            role="presentation"
          />
          <div className="relative w-full max-w-[720px] rounded-3xl border border-white/10 bg-agri-card botanical-shadow p-6 sm:p-8">
            <div className="flex items-start gap-3 mb-6">
              <span className="material-symbols-outlined text-primary text-xl">add_circle</span>
              <div className="flex-1">
                <h2 className="font-headline font-bold text-lg">Create Project</h2>
                <p className="text-xs text-agri-text-muted mt-1">
                  Enter farmer and crop details. This will create a new fundable project.
                </p>
              </div>
              <button
                type="button"
                className="text-on-surface-variant hover:text-on-surface"
                onClick={() => (!creating ? setCreateOpen(false) : null)}
                aria-label="Close"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase text-agri-text-muted font-bold">Farmer name</span>
                <input
                  className="px-3 py-2 rounded-xl bg-agri-bg-soft border border-white/10 text-sm"
                  value={form.farmerName}
                  onChange={(e) => setForm((f) => ({ ...f, farmerName: e.target.value }))}
                  placeholder="e.g. Neha Sharma"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase text-agri-text-muted font-bold">Phone number</span>
                <input
                  className="px-3 py-2 rounded-xl bg-agri-bg-soft border border-white/10 text-sm"
                  value={form.phoneNumber}
                  onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                  placeholder="e.g. 9876543210"
                />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-[10px] uppercase text-agri-text-muted font-bold">Location</span>
                <input
                  className="px-3 py-2 rounded-xl bg-agri-bg-soft border border-white/10 text-sm"
                  value={form.farmLocation}
                  onChange={(e) => setForm((f) => ({ ...f, farmLocation: e.target.value }))}
                  placeholder="e.g. Nashik, Maharashtra"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase text-agri-text-muted font-bold">Crop name</span>
                <input
                  className="px-3 py-2 rounded-xl bg-agri-bg-soft border border-white/10 text-sm"
                  value={form.cropName}
                  onChange={(e) => setForm((f) => ({ ...f, cropName: e.target.value }))}
                  placeholder="e.g. Wheat"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase text-agri-text-muted font-bold">Quantity</span>
                <input
                  type="number"
                  className="px-3 py-2 rounded-xl bg-agri-bg-soft border border-white/10 text-sm"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  placeholder="e.g. 1200"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase text-agri-text-muted font-bold">No. of acres</span>
                <input
                  type="number"
                  className="px-3 py-2 rounded-xl bg-agri-bg-soft border border-white/10 text-sm"
                  value={form.acres}
                  onChange={(e) => setForm((f) => ({ ...f, acres: e.target.value }))}
                  placeholder="e.g. 8"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase text-agri-text-muted font-bold">Expected yield</span>
                <input
                  type="number"
                  className="px-3 py-2 rounded-xl bg-agri-bg-soft border border-white/10 text-sm"
                  value={form.expectedYield}
                  onChange={(e) => setForm((f) => ({ ...f, expectedYield: e.target.value }))}
                  placeholder="e.g. 3000"
                />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-[10px] uppercase text-agri-text-muted font-bold">Target fund (₹)</span>
                <input
                  type="number"
                  className="px-3 py-2 rounded-xl bg-agri-bg-soft border border-white/10 text-sm"
                  value={form.targetFund}
                  onChange={(e) => setForm((f) => ({ ...f, targetFund: e.target.value }))}
                  placeholder="e.g. 50000"
                />
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-7">
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-agri-bg-soft border border-white/10 text-sm font-bold hover:border-primary/30"
                onClick={() => (!creating ? setCreateOpen(false) : null)}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createProject}
                disabled={creating}
                className="px-4 py-2 rounded-xl growth-gradient text-on-primary text-sm font-bold disabled:opacity-60"
              >
                {creating ? "Creating…" : "Create project"}
              </button>
            </div>
          </div>
        </div>
      )}

      {view === "dashboard" && (
        <>
          <section className="mb-6 rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
                      {/* Sensor Readings Table */}
                      <section className="mb-6 rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
                        <div className="flex items-center gap-2 mb-5">
                          <span className="material-symbols-outlined text-primary text-xl">sensors</span>
                          <h2 className="font-headline font-bold text-lg">Sensor Readings History</h2>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="bg-primary/10">
                                <th className="px-3 py-2 text-left">Date</th>
                                <th className="px-3 py-2 text-left">Soil Moisture</th>
                                <th className="px-3 py-2 text-left">Temperature</th>
                                <th className="px-3 py-2 text-left">Humidity</th>
                                <th className="px-3 py-2 text-left">Threshold Met</th>
                              </tr>
                            </thead>
                            <tbody>
                              {readings.length === 0 ? (
                                <tr><td colSpan="5" className="px-3 py-2 text-center text-agri-text-muted">No readings yet.</td></tr>
                              ) : (
                                readings.map((r, idx) => (
                                  <tr key={r._id || idx} className="border-b border-white/10">
                                    <td className="px-3 py-2">{fmtDate(r.createdAt)}</td>
                                    <td className="px-3 py-2">{r.soilMoisture ?? "—"}</td>
                                    <td className="px-3 py-2">{r.temperature ?? "—"}</td>
                                    <td className="px-3 py-2">{r.humidity ?? "—"}</td>
                                    <td className="px-3 py-2">{String(r.thresholdMet)}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </section>
            <div className="flex flex-wrap items-start gap-4">
              <div className="min-w-[220px] flex-1">
                <div className="text-[10px] uppercase text-agri-text-muted font-bold tracking-wider">Current project</div>
                <div className="mt-1 font-headline font-extrabold text-xl">{selectedProject?.title || "—"}</div>
                <div className="mt-2 text-sm text-on-surface-variant">
                  {selectedProject?.farmLocation || selectedProject?.location || "Location —"}
                  {selectedProject?.phoneNumber ? ` · ${selectedProject.phoneNumber}` : ""}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="px-4 py-3 rounded-2xl bg-agri-bg-soft border border-white/10 min-w-[180px]">
                  <div className="text-[10px] uppercase text-agri-text-muted font-bold tracking-wider">Stage</div>
                  <div className="mt-1 text-lg font-headline font-bold">{isCompleted ? "Harvest Completed" : currentStageLabel}</div>
                  <div className="mt-1 text-xs text-on-surface-variant">
                    Status: {isCompleted ? "completed" : selectedProject?.milestoneStatus || "pending"}
                  </div>
                </div>
                <div className="px-4 py-3 rounded-2xl bg-agri-bg-soft border border-white/10 min-w-[180px]">
                  <div className="text-[10px] uppercase text-agri-text-muted font-bold tracking-wider">Crop</div>
                  <div className="mt-1 text-lg font-headline font-bold">{selectedProject?.cropName || selectedProject?.cropType || "—"}</div>
                  <div className="mt-1 text-xs text-on-surface-variant">
                    Qty: {Number(selectedProject?.quantity || 0) || 0} · Acres: {Number(selectedProject?.acres || 0) || 0}
                  </div>
                </div>
                <div className="px-4 py-3 rounded-2xl border border-primary/40 bg-primary/5 min-w-[180px]">
                  <div className="text-[10px] uppercase text-agri-text-muted font-bold tracking-wider">Expected yield</div>
                  <div className="mt-1 text-lg font-headline font-bold text-primary">
                    {Number(selectedProject?.expectedYield || 0) || 0}
                  </div>
                  <div className="mt-1 text-xs text-on-surface-variant">Created: {fmtDate(selectedProject?.createdAt)}</div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
            <div className="flex items-center gap-2 mb-5">
              <span className="material-symbols-outlined text-primary text-xl">timeline</span>
              <h2 className="font-headline font-bold text-lg">Milestone progress</h2>
              <span className="ml-auto text-[10px] font-semibold tracking-widest text-agri-text-muted uppercase">Current stage</span>
            </div>

            <div className="rounded-2xl bg-agri-bg-soft border border-white/10 p-5">
              <div className="relative">
                <div className="absolute left-0 right-0 top-[18px] h-[2px] bg-white/10 rounded-full" />
                <div
                  className="absolute left-0 top-[18px] h-[2px] bg-primary/60 rounded-full"
                  style={{ width: `${isCompleted ? 100 : (milestoneIdx / (MILESTONE_STEPS.length - 1)) * 100}%` }}
                />
                <div className="grid grid-cols-4 gap-2">
                  {MILESTONE_STEPS.map((s) => {
                    const active = !isCompleted && s.idx === milestoneIdx;
                    const done = isCompleted ? true : s.idx < milestoneIdx;
                    return (
                      <div key={s.key} className="flex flex-col items-center text-center">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                            active
                              ? "border-primary bg-primary/15 text-primary shadow-[0_0_0_4px_rgba(33,214,182,0.10)]"
                              : done
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-white/10 bg-black/10 text-on-surface-variant"
                          }`}
                        >
                          {done ? <span className="material-symbols-outlined text-[18px]">check</span> : s.idx + 1}
                        </div>
                        <div className={`mt-2 text-xs font-bold ${active || done ? "text-on-surface" : "text-on-surface-variant"}`}>
                          {s.label}
                        </div>
                        <div className="text-[10px] text-agri-text-muted mt-0.5">{fmtDate(selectedProject?.createdAt)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-primary text-xl">wifi_tethering</span>
            <h2 className="font-headline font-bold text-lg">Live Field Metrics</h2>
            <span className="ml-auto text-[10px] font-semibold tracking-widest text-agri-text-muted uppercase">
              Latest reading
            </span>
          </div>
          <div className="space-y-6">
            <MetricRow label="Soil Moisture" value={`${soil}%`} pct={Math.min(100, soil)} barClass="bg-primary" />
            <MetricRow label="Air Temperature" value={`${temp}°C`} pct={Math.min(100, (temp / 35) * 100)} barClass="bg-primary/80" />
            <MetricRow label="Air Humidity" value={`${hum}%`} sub="Live" pct={hum} barClass="bg-white/25" />
          </div>
        </section>

        <section className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-primary text-xl">account_balance_wallet</span>
            <h2 className="font-headline font-bold text-lg">Project Escrow</h2>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 px-4 rounded-xl bg-agri-bg-soft">
              <span className="text-sm text-agri-text-muted">Locked (API)</span>
              <span className="font-headline font-bold">
                {escrow?.totalLocked != null ? fmtMoney(escrow.totalLocked) : "—"}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 px-4 rounded-xl border border-primary/40 bg-primary/5">
              <span className="text-sm text-agri-text-muted">Released (project)</span>
              <span className="font-headline font-bold text-primary">
                {selectedProject?.releasedFunds != null ? fmtMoney(selectedProject.releasedFunds) : fmtMoney(0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 px-4 rounded-xl bg-agri-bg-soft">
              <span className="text-sm text-agri-text-muted">Funded / Target</span>
              <span className="font-headline font-bold">
                {fmtMoney(selectedProject?.fundedAmount || 0)} / {fmtMoney(selectedProject?.targetFund || 0)}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow relative overflow-hidden xl:col-span-2">
          <div className="flex items-start gap-2 mb-4">
            <span className="material-symbols-outlined text-primary text-xl">cloud_upload</span>
            <div>
              <h2 className="font-headline font-bold text-lg">Verification Upload</h2>
              <p className="text-xs text-agri-text-muted mt-1 max-w-md">
                Requires Cloudinary on the server. Links photo to project + investment for expert review.
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[10px] uppercase text-agri-text-muted font-bold block mb-1">Milestone stage</label>
              <select
                className="w-full px-3 py-2 rounded-xl bg-agri-bg-soft border border-white/10 text-sm"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              >
                {STAGES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex flex-col gap-2 w-full">
                <span className="text-[10px] uppercase text-agri-text-muted font-bold">Photo file</span>
                <input type="file" accept="image/*" onChange={onUpload} className="text-sm text-on-surface-variant" />
              </label>
            </div>
          </div>
          <div className="text-xs text-agri-text-muted">
            Stage status: <span className="font-bold text-on-surface">{selectedStageProofLabel}</span>
            {selectedStageProof?.uploaded_at ? ` · ${fmtDate(selectedStageProof.uploaded_at)}` : ""}
            {selectedStageProof?.verified_at ? ` · verified ${fmtDate(selectedStageProof.verified_at)}` : ""}
          </div>
        </section>
      </div>
        </>
      )}

      {view === "projects" && (
        <section className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-primary text-xl">inventory_2</span>
            <h2 className="font-headline font-bold text-lg">Projects</h2>
            <span className="ml-auto text-[10px] font-semibold tracking-widest text-agri-text-muted uppercase">
              Current + previous projects
            </span>
          </div>

          {loading ? (
            <div className="text-sm text-on-surface-variant">Loading…</div>
          ) : projects.length === 0 ? (
            <div className="text-sm text-on-surface-variant">No projects yet. Create one to get started.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {projects.map((p) => {
                const isSelected = p._id === projectId;
                const pct = p.targetFund ? Math.min(100, (Number(p.fundedAmount || 0) / Number(p.targetFund || 1)) * 100) : 0;
                const idx = Math.max(0, Math.min(3, Number(p.currentMilestone ?? 0) || 0));
                const stageLabel = MILESTONE_STEPS.find((s) => s.idx === idx)?.label || "Growing";
                return (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => setProjectId(p._id)}
                    className={`text-left rounded-2xl border p-5 transition-all ${
                      isSelected
                        ? "border-primary/50 bg-primary/5"
                        : "border-white/10 bg-agri-bg-soft hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <span className="material-symbols-outlined">agriculture</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-headline font-extrabold truncate">{p.title}</div>
                        <div className="mt-1 text-xs text-on-surface-variant truncate">
                          {p.farmLocation || "—"} · {p.cropName || p.cropType || "—"} · Stage: {stageLabel}
                        </div>
                      </div>
                      {isSelected && (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-primary/15 text-primary font-bold">Current</span>
                      )}
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-xs text-on-surface-variant">
                        <span>Funded</span>
                        <span className="font-bold text-on-surface">
                          {fmtMoney(p.fundedAmount || 0)} / {fmtMoney(p.targetFund || 0)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full bg-primary/70 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-agri-text-muted">
                        <span>Created: {fmtDate(p.createdAt)}</span>
                        <span>Status: {p.status || "active"}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {view === "portfolio" && (
        <section className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-primary text-xl">monitoring</span>
            <h2 className="font-headline font-bold text-lg">Your Portfolio</h2>
            <span className="ml-auto text-[10px] font-semibold tracking-widest text-agri-text-muted uppercase">
              Real-time project funding and release data
            </span>
          </div>

          {loading ? (
            <div className="text-sm text-on-surface-variant">Loading…</div>
          ) : projects.length === 0 ? (
            <div className="text-sm text-on-surface-variant">No projects yet. Create your first project to build portfolio history.</div>
          ) : (
            <div className="space-y-4">
              {projects.map((p) => {
                const isCurrent = p._id === projectId;
                const status = String(p.status || "active").toLowerCase();
                const statusDot =
                  status === "completed"
                    ? "bg-white/70"
                    : status === "failed"
                      ? "bg-red-400"
                      : "bg-primary";
                return (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => setProjectId(p._id)}
                    className={`w-full text-left rounded-2xl border p-5 transition-all ${
                      isCurrent
                        ? "border-primary/50 bg-primary/5"
                        : "border-white/10 bg-agri-bg-soft hover:border-primary/30"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${statusDot}`} />
                          <span className="text-[10px] uppercase tracking-wider text-agri-text-muted font-bold">
                            {status}
                          </span>
                        </div>
                        <div className="mt-2 font-headline font-extrabold text-2xl">
                          {p.title}
                        </div>
                        <div className="mt-1 text-sm text-on-surface-variant">
                          {p.farmLocation || "Location unavailable"}
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-md bg-white/10 text-[10px] text-agri-text-muted font-semibold uppercase">
                        {timeAgoLabel(p.createdAt)}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <div className="text-[10px] uppercase text-agri-text-muted font-bold tracking-wider">Invested</div>
                        <div className="mt-1 text-xl font-headline font-bold">
                          {fmtMoney(p.fundedAmount || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-agri-text-muted font-bold tracking-wider">Released</div>
                        <div className="mt-1 text-xl font-headline font-bold text-primary">
                          {fmtMoney(p.releasedFunds || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-agri-text-muted font-bold tracking-wider">Escrow Locked</div>
                        <div className="mt-1 text-xl font-headline font-bold">
                          {fmtMoney(p.escrowBalance || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-agri-text-muted font-bold tracking-wider">Target</div>
                        <div className="mt-1 text-xl font-headline font-bold">
                          {fmtMoney(p.targetFund || 0)}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {view === "milestones" && (
        <section className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-primary text-xl">timeline</span>
            <h2 className="font-headline font-bold text-lg">Milestones</h2>
            <span className="ml-auto text-[10px] font-semibold tracking-widest text-agri-text-muted uppercase">
              {selectedProject?.title ? "Current project" : "No project selected"}
            </span>
          </div>

          <div className="rounded-2xl bg-agri-bg-soft border border-white/10 p-5">
            <div className="relative">
              <div className="absolute left-0 right-0 top-[18px] h-[2px] bg-white/10 rounded-full" />
              <div
                className="absolute left-0 top-[18px] h-[2px] bg-primary/70 rounded-full"
                style={{ width: `${(milestoneIdx / (MILESTONE_STEPS.length - 1)) * 100}%` }}
              />
              <div className="grid grid-cols-4 gap-2">
                {MILESTONE_STEPS.map((s) => {
                  const active = s.idx === milestoneIdx;
                  const done = s.idx < milestoneIdx;
                  return (
                    <div key={s.key} className="flex flex-col items-center text-center">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                          active
                            ? "border-primary bg-primary/15 text-primary shadow-[0_0_0_4px_rgba(33,214,182,0.10)]"
                            : done
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-white/10 bg-black/10 text-on-surface-variant"
                        }`}
                        >
                        {done ? <span className="material-symbols-outlined text-[18px]">check</span> : s.idx + 1}
                      </div>
                      <div className={`mt-2 text-xs font-bold ${active ? "text-on-surface" : "text-on-surface-variant"}`}>
                        {s.label}
                      </div>
                      <div className="text-[10px] text-agri-text-muted mt-0.5">{fmtDate(selectedProject?.createdAt)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-6 grid lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-white/10 bg-agri-bg-soft p-5">
              <div className="text-[10px] uppercase text-agri-text-muted font-bold tracking-wider">Current stage</div>
              <div className="mt-2 text-xl font-headline font-extrabold">{currentStageLabel}</div>
              <div className="mt-2 text-sm text-on-surface-variant">
                Milestone status: <span className="font-bold text-on-surface">{selectedProject?.milestoneStatus || "pending"}</span>
              </div>
              <div className="mt-2 text-sm text-on-surface-variant">
                Latest proof: <span className="font-bold text-on-surface">{latestProof?.status || "PENDING"}</span>
                {latestProof?.stage ? ` · ${String(latestProof.stage).replace(/-/g, " ")}` : ""}
                {latestProof?.verified_at ? ` · ${fmtDate(latestProof.verified_at)}` : ""}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-agri-bg-soft p-5">
              <div className="text-[10px] uppercase text-agri-text-muted font-bold tracking-wider">Verification upload</div>
              <div className="mt-2 text-sm text-on-surface-variant">
                Upload a milestone photo for expert review (links to current project + investment).
              </div>
              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase text-agri-text-muted font-bold block mb-1">Milestone stage</label>
                  <select
                    className="w-full px-3 py-2 rounded-xl bg-agri-bg-soft border border-white/10 text-sm"
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                  >
                    {STAGES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex flex-col gap-2 w-full">
                    <span className="text-[10px] uppercase text-agri-text-muted font-bold">Photo file</span>
                    <input type="file" accept="image/*" onChange={onUpload} className="text-sm text-on-surface-variant" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {view === "reports" && (
        <section className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-primary text-xl">bar_chart</span>
            <h2 className="font-headline font-bold text-lg">Farmer Reports</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl bg-agri-bg-soft border border-white/10 p-4">
              <div className="text-[10px] uppercase tracking-wider text-agri-text-muted font-bold">Total projects</div>
              <div className="mt-2 text-3xl font-headline font-extrabold">{projects.length}</div>
            </div>
            <div className="rounded-xl bg-agri-bg-soft border border-white/10 p-4">
              <div className="text-[10px] uppercase tracking-wider text-agri-text-muted font-bold">Total funded</div>
              <div className="mt-2 text-3xl font-headline font-extrabold text-primary">
                {fmtMoney(projects.reduce((s, p) => s + Number(p.fundedAmount || 0), 0))}
              </div>
            </div>
            <div className="rounded-xl bg-agri-bg-soft border border-white/10 p-4">
              <div className="text-[10px] uppercase tracking-wider text-agri-text-muted font-bold">Total released</div>
              <div className="mt-2 text-3xl font-headline font-extrabold text-primary">
                {fmtMoney(projects.reduce((s, p) => s + Number(p.releasedFunds || 0), 0))}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {projects.map((p) => (
              <div key={p._id} className="rounded-xl border border-white/10 bg-agri-bg-soft p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{p.title}</div>
                    <div className="text-xs text-agri-text-muted mt-1">
                      {p.cropName || p.cropType || "Crop"} · {p.farmLocation || "Location"}
                    </div>
                  </div>
                  <div className="text-xs text-agri-text-muted">
                    Status: <span className="text-on-surface font-semibold">{p.status || "active"}</span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>Funded: <span className="font-semibold">{fmtMoney(p.fundedAmount || 0)}</span></div>
                  <div>Released: <span className="font-semibold">{fmtMoney(p.releasedFunds || 0)}</span></div>
                  <div>Escrow: <span className="font-semibold">{fmtMoney(p.escrowBalance || 0)}</span></div>
                  <div>Target: <span className="font-semibold">{fmtMoney(p.targetFund || 0)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </ConsoleShell>
  );
}
