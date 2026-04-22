import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import ConsoleShell from "../components/ConsoleShell";

function fmtCurrency(v) {
  return Number(v || 0).toLocaleString("en-IN");
}

function fmtMoney(v) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));
}

export default function BuyerDashboard() {
  const [projects, setProjects] = useState([]);
  const [orders, setOrders] = useState([]);
  const [marketFeed, setMarketFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qtyByProject, setQtyByProject] = useState({});
  const [search, setSearch] = useState("");
  const [lastSync, setLastSync] = useState(null);
  const [buyingId, setBuyingId] = useState("");

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [projectsRes, activityRes] = await Promise.all([
        api.get("/api/buyer/completed-projects"),
        api.get("/api/buyer/activity"),
      ]);
      const list = Array.isArray(projectsRes.data) ? projectsRes.data : [];
      setProjects(list);
      setOrders(Array.isArray(activityRes.data?.myOrders) ? activityRes.data.myOrders : []);
      setMarketFeed(Array.isArray(activityRes.data?.marketFeed) ? activityRes.data.marketFeed : []);
      setQtyByProject((prev) => {
        const next = { ...prev };
        for (const p of list) {
          if (!next[p._id]) next[p._id] = "1";
        }
        return next;
      });
      setLastSync(new Date());
    } catch (e) {
      alert(e.response?.data?.error || e.message || "Failed to load buyer dashboard");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 10000);
    return () => clearInterval(id);
  }, []);

  const totalSpent = useMemo(
    () => orders.reduce((sum, o) => sum + Number(o.total || 0), 0),
    [orders]
  );

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      [p.title, p.cropName, p.cropType, p.farmerName, p.farmLocation]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [projects, search]);

  const placeOrder = async (project) => {
    const qty = Number(qtyByProject[project._id] || 1);
    if (!qty || qty <= 0) return alert("Enter valid quantity");
    const defaultUnitPrice = 100;
    try {
      setBuyingId(project._id);
      await api.post("/api/buyer/purchase", {
        projectId: project._id,
        quantity: qty,
        unitPrice: defaultUnitPrice,
      });
      alert("Purchase order placed");
      await load();
    } catch (e) {
      alert(e.response?.data?.error || e.message || "Could not place order");
    } finally {
      setBuyingId("");
    }
  };

  return (
    <ConsoleShell
      activeTop="buyer"
      activeSidebar="dashboard"
      pageTitle="Buyer Dashboard"
      pageSubtitle="Real-time marketplace for completed and verified projects"
    >
      {loading ? (
        <p className="text-agri-text-muted">Loading…</p>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-white/8 bg-agri-card p-3">
            <input
              type="search"
              placeholder="Search by crop, farmer, project, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[220px] px-4 py-2.5 rounded-xl bg-agri-bg-soft border border-white/10 text-sm"
            />
            <button
              type="button"
              onClick={() => load(true)}
              className="px-4 py-2 rounded-xl border border-primary/50 text-primary text-sm font-bold hover:bg-primary/10"
            >
              Refresh
            </button>
            <span className="text-xs text-agri-text-muted">
              Live sync: {lastSync ? lastSync.toLocaleTimeString() : "—"}
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
            <div className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
              <p className="text-[10px] font-bold tracking-[0.2em] text-agri-text-muted uppercase mb-2">Completed projects</p>
              <div className="text-4xl font-headline font-extrabold">{filteredProjects.length}</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
              <p className="text-[10px] font-bold tracking-[0.2em] text-agri-text-muted uppercase mb-2">Orders placed</p>
              <div className="text-4xl font-headline font-extrabold">{orders.length}</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
              <p className="text-[10px] font-bold tracking-[0.2em] text-agri-text-muted uppercase mb-2">Total spend</p>
              <div className="text-4xl font-headline font-extrabold text-primary">{fmtMoney(totalSpent)}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow mb-8">
            <h2 className="text-2xl font-headline font-extrabold tracking-tight mb-6">Completed Projects Marketplace</h2>
            {filteredProjects.length === 0 ? (
              <div className="text-sm text-on-surface-variant">No completed projects available yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProjects.map((p) => (
                  <article key={p._id} className="rounded-2xl border border-white/10 bg-agri-bg-soft p-5">
                    <h3 className="font-headline font-bold text-lg">{p.title}</h3>
                    <p className="text-xs text-agri-text-muted mt-1">
                      {p.farmerName || "Farmer"} · {p.farmLocation || "Location unavailable"}
                    </p>
                    <div className="mt-4 text-sm space-y-1 text-on-surface-variant">
                      <div>Crop: <span className="text-on-surface font-semibold">{p.cropName || p.cropType || "—"}</span></div>
                      <div>Expected yield: <span className="text-on-surface font-semibold">{fmtCurrency(p.expectedYield)}</span></div>
                      <div>Released value: <span className="text-on-surface font-semibold">{fmtMoney(p.releasedFunds)}</span></div>
                      <div>Available: <span className="text-on-surface font-semibold">{fmtCurrency(p.availableQty)}</span></div>
                      <div>Sold: <span className="text-on-surface font-semibold">{fmtCurrency(p.soldQty)}</span> ({p.totalOrders || 0} orders)</div>
                    </div>
                    <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-on-surface-variant">
                      <div className="font-semibold text-primary mb-1">Buyer Trust Signals</div>
                      <div>
                        Farmer verification:{" "}
                        <span className="font-semibold text-on-surface">
                          {String(p.trustDetails?.verificationStatus || "approved").toUpperCase()}
                        </span>
                      </div>
                      <div>
                        Credit score:{" "}
                        <span className="font-semibold text-on-surface">
                          {Number(p.trustDetails?.creditScore || 0)}
                        </span>
                      </div>
                      <div>
                        Verification note:{" "}
                        <span className="font-semibold text-on-surface">
                          {p.trustDetails?.verificationRemark || "Criteria matched for approved listing"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        value={qtyByProject[p._id] || "1"}
                        onChange={(e) =>
                          setQtyByProject((prev) => ({ ...prev, [p._id]: e.target.value }))
                        }
                        className="w-24 px-3 py-2 rounded-xl bg-black/20 border border-white/10 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => placeOrder(p)}
                        disabled={Number(p.availableQty || 0) <= 0 || buyingId === p._id}
                        className="flex-1 py-2.5 rounded-xl growth-gradient text-on-primary font-bold text-sm disabled:opacity-50"
                      >
                        {buyingId === p._id ? "Placing..." : Number(p.availableQty || 0) <= 0 ? "Sold Out" : "Buy Now"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
            <h2 className="text-xl font-headline font-extrabold mb-4">Live Market Activity</h2>
            {marketFeed.length === 0 ? (
              <div className="text-sm text-on-surface-variant">No recent market activity yet.</div>
            ) : (
              <div className="space-y-3">
                {marketFeed.slice(0, 8).map((o) => (
                  <div key={o._id} className="rounded-xl border border-white/10 bg-agri-bg-soft p-3 text-sm">
                    <div className="font-semibold">{o.items?.[0]?.name || "Order"}</div>
                    <div className="text-xs text-agri-text-muted mt-1">
                      Qty {o.items?.[0]?.qty || 0} · Total {fmtMoney(o.total)} · {new Date(o.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </ConsoleShell>
  );
}
