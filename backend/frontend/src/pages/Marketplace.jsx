import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import ConsoleShell from "../components/ConsoleShell";

export default function Marketplace() {
  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [investingId, setInvestingId] = useState("");
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);
  const isInvestor = String(user?.role || "").toLowerCase() === "investor";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/api/projects", { params: { t: Date.now() } });
        if (!cancelled) {
          setProjects(Array.isArray(res.data) ? res.data : []);
        }
      } catch {
        if (!cancelled) setProjects([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return projects;
    return projects.filter((p) =>
      [p.title, p.cropName, p.cropType, p.farmerName, p.farmLocation]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [projects, search]);

  const investNow = async (project) => {
    if (!isInvestor) {
      alert("Login as an investor to invest.");
      return;
    }
    const raw = window.prompt("Enter investment amount", "5000");
    const amount = Number(raw);
    if (!amount || amount <= 0) {
      return;
    }
    setInvestingId(project._id);
    try {
      await api.post("/api/invest", { projectId: project._id, amount });
      alert("Investment successful.");
      const res = await api.get("/api/projects", { params: { t: Date.now() } });
      setProjects(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      alert(e.response?.data?.error || e.message || "Investment failed");
    } finally {
      setInvestingId("");
    }
  };

  return (
    <ConsoleShell
      showSidebar={false}
      omitPageHeader
      activeTop="marketplace"
      searchPlaceholder="Search produce, farms, SKUs…"
      topSearchValue={search}
      onTopSearchChange={setSearch}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-[10px] font-bold tracking-[0.25em] text-primary uppercase mb-2">Direct from origin</p>
            <h1 className="text-3xl sm:text-4xl font-headline font-extrabold tracking-tight text-on-surface">
              Funding Marketplace
            </h1>
            <p className="text-sm text-agri-text-muted mt-3 max-w-xl leading-relaxed">
              Live agricultural projects created by farmers. Invest to fund and track them in your portfolio.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-agri-text-muted">
              {filtered.length} projects
            </span>
          </div>
        </div>

        <div className="lg:hidden relative max-w-md mb-8">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-agri-text-muted text-xl">
            search
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search produce, farms, SKUs…"
            className="w-full pl-10 pr-4 py-3 rounded-full bg-[#161e2b] border border-white/10 text-sm outline-none focus:ring-2 focus:ring-primary/25"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {loading ? (
            <div className="col-span-full rounded-xl border border-dashed border-white/15 bg-[#161e2b]/50 py-20 text-center text-agri-text-muted">
              Loading projects...
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-white/15 bg-[#161e2b]/50 py-20 text-center text-agri-text-muted">
              No listings match your search.
            </div>
          ) : (
            filtered.map((p) => (
              <article
                key={p._id}
                className="rounded-xl border border-white/[0.06] bg-[#161e2b] overflow-hidden flex flex-col hover:border-primary/20 transition-colors group"
              >
                <div className="relative h-44 overflow-hidden bg-agri-bg-soft">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-primary/50">agriculture</span>
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h2 className="font-headline font-bold text-base leading-snug">{p.title}</h2>
                  <p className="text-lg font-extrabold text-primary mt-2">
                    {Number(p.targetFund || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-agri-text-muted mt-1">
                    {p.farmerName || "Farmer"} · {p.farmLocation || "Location unavailable"}
                  </p>

                  <div className="mt-4 flex items-start gap-2 py-3 px-3 rounded-lg bg-[#0a111a] border border-white/5">
                    <span className="material-symbols-outlined text-primary text-xl shrink-0">show_chart</span>
                    <div>
                      <p className="text-[10px] font-bold text-agri-text-muted uppercase tracking-wider">Funding Progress</p>
                      <p className="text-sm font-semibold text-on-surface mt-0.5">
                        {Math.min(100, Math.round((Number(p.fundedAmount || 0) / Math.max(1, Number(p.targetFund || 0))) * 100))}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-agri-text-muted">
                    Crop: {p.cropName || p.cropType || "—"}
                  </div>

                  <button
                    type="button"
                    onClick={() => investNow(p)}
                    disabled={!isInvestor || investingId === p._id}
                    className="mt-5 w-full py-3 rounded-xl growth-gradient text-on-primary font-headline font-bold text-xs uppercase tracking-wide hover:opacity-95 transition-opacity disabled:opacity-50"
                  >
                    {investingId === p._id ? "Investing..." : "Invest Now"}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </ConsoleShell>
  );
}
