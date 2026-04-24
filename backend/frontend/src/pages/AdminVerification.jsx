import { useState, useEffect, useMemo } from "react";
import api from "../services/api";
import ConsoleShell from "../components/ConsoleShell";

export default function AdminVerification() {
  const [mode, setMode] = useState("photos");
  const [farmers, setFarmers] = useState([]);
  const [photoQueue, setPhotoQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [remarksByPhoto, setRemarksByPhoto] = useState({});
  const [busyPhotoId, setBusyPhotoId] = useState("");

  const loadFarmers = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get("/api/admin/farmer-verifications");
      setFarmers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      alert(e.response?.data?.error || e.message || "Failed to load farmer verifications");
      setFarmers([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadPhotoQueue = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      let res;
      try {
        res = await api.get("/api/admin/pending-verifications");
      } catch (_err) {
        res = await api.get("/api/expert/pending-verifications");
      }
      setPhotoQueue(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      alert(e.response?.data?.error || e.message || "Failed to load photo verification queue");
      setPhotoQueue([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === "farmers") {
      loadFarmers();
    } else {
      loadPhotoQueue();
    }
    const id = setInterval(() => {
      if (mode === "farmers") loadFarmers(true);
      else loadPhotoQueue(true);
    }, 10000);
    return () => clearInterval(id);
  }, [mode]);

  const filteredFarmers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return farmers.filter((f) => {
      const statusOk = statusFilter === "all" || f.verificationStatus === statusFilter;
      if (!statusOk) return false;
      if (!q) return true;
      return [f.name, f.email].join(" ").toLowerCase().includes(q);
    });
  }, [farmers, search, statusFilter]);

  const filteredPhotos = useMemo(() => {
    const q = search.trim().toLowerCase();
    return photoQueue.filter((p) => {
      const stage = String(p.raw?.stage || p.tag || "").toLowerCase();
      const statusOk = statusFilter === "all" || statusFilter === "pending";
      if (!statusOk) return false;
      if (!q) return true;
      return [p.farmerName, p.title, p.location, stage].join(" ").toLowerCase().includes(q);
    });
  }, [photoQueue, search, statusFilter]);

  const updateStatus = async (farmerId, verificationStatus) => {
    const now = new Date();
    const actionStamp = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    const reasons = {
      approved:
        `Accepted at ${actionStamp}: KYC matched, contact details valid, land ownership proof verified, and risk profile within onboarding threshold.`,
      hold:
        `Hold at ${actionStamp}: missing or unclear document(s); request updated KYC/land proof and re-review within 48 hours.`,
      rejected:
        `Rejected at ${actionStamp}: critical mismatch or fraudulent indicators in identity/farm evidence.`,
    };
    try {
      await api.patch(`/api/admin/users/${farmerId}`, {
        verificationStatus,
        verificationRemark: reasons[verificationStatus] || "",
      });
      setFarmers((prev) =>
        prev.map((f) =>
          f._id === farmerId
            ? { ...f, verificationStatus, verificationRemark: reasons[verificationStatus] || "" }
            : f
        )
      );
    } catch (e) {
      alert(e.response?.data?.error || e.message || "Could not update verification");
    }
  };

  const verifyPhoto = async (photoId, verdict) => {
    setBusyPhotoId(photoId);
    try {
      const remarks = String(remarksByPhoto[photoId] || "").trim();
      const res = await api.patch("/api/crop/photo/verify", {
        photo_id: photoId,
        verdict,
        remarks,
      });

      setPhotoQueue((prev) => prev.filter((item) => item._id !== photoId));

      const release = res?.data?.release;
      if (release?.released) {
        alert(`Photo ${verdict}. Funds released: ₹${release.releaseAmount || 0}`);
      } else {
        alert(`Photo ${verdict}. Funds not released yet: ${release?.reason || "Awaiting IoT/photo gate."}`);
      }
    } catch (e) {
      alert(e.response?.data?.error || e.message || "Could not verify photo");
    } finally {
      setBusyPhotoId("");
    }
  };

  return (
    <ConsoleShell activeTop="queue" activeSidebar="queue" omitPageHeader>
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-8">
        <div className="max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-headline font-extrabold tracking-tight text-on-surface">
            {mode === "farmers" ? "Farmer Verification" : "Photo Verification"}
          </h1>
          <p className="text-sm text-agri-text-muted mt-2 leading-relaxed">
            {mode === "farmers"
              ? "Verify registered farmers. Only approved farmers are discoverable to investors in search and marketplace."
              : "Review stage proof photos uploaded by farmers. Approve or reject each proof to continue milestone validation."}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#161e2b] px-5 py-3 text-xs font-bold text-primary shadow-lg">
          {mode === "farmers" ? filteredFarmers.length : filteredPhotos.length} in view
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("photos")}
          className={`px-3 py-2 rounded-lg text-xs font-bold border ${mode === "photos" ? "border-primary/50 text-primary bg-primary/10" : "border-white/10 text-agri-text-muted"}`}
        >
          Photo Queue
        </button>
        <button
          type="button"
          onClick={() => setMode("farmers")}
          className={`px-3 py-2 rounded-lg text-xs font-bold border ${mode === "farmers" ? "border-primary/50 text-primary bg-primary/10" : "border-white/10 text-agri-text-muted"}`}
        >
          Farmer KYC
        </button>
      </div>

      <div className="mb-6 rounded-xl border border-white/10 bg-[#161e2b] p-3 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder={mode === "farmers" ? "Search by farmer name or email..." : "Search by farmer, project, stage..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[220px] px-3 py-2 rounded-lg bg-agri-bg-soft border border-white/10 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-agri-bg-soft border border-white/10 text-sm"
        >
          {mode === "farmers" ? (
            <>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="hold">Hold</option>
              <option value="rejected">Rejected</option>
            </>
          ) : (
            <>
              <option value="pending">Pending</option>
              <option value="all">All</option>
            </>
          )}
        </select>
        <button
          type="button"
          onClick={() => (mode === "farmers" ? loadFarmers(true) : loadPhotoQueue(true))}
          className="px-4 py-2 rounded-lg border border-primary/40 text-primary text-sm font-bold hover:bg-primary/10"
        >
          Refresh
        </button>
      </div>

      {mode === "farmers" ? (
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <article className="rounded-xl border border-primary/25 bg-agri-card overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=900&q=80"
            alt=""
            className="w-full h-28 object-cover"
          />
          <div className="p-3">
            <h3 className="text-sm font-bold text-primary">Accept Basis</h3>
            <p className="text-xs text-agri-text-muted mt-1">
              Identity match, valid farm proof, consistent geo details, and acceptable risk profile.
            </p>
            <ul className="mt-2 text-[11px] text-on-surface-variant space-y-1">
              <li>Required: Govt ID + selfie match, land docs, bank details</li>
              <li>SLA: decision within 24 hours of complete submission</li>
              <li>Stamp: always capture decision date and reviewer note</li>
            </ul>
          </div>
        </article>
        <article className="rounded-xl border border-amber-300/25 bg-agri-card overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=900&q=80"
            alt=""
            className="w-full h-28 object-cover"
          />
          <div className="p-3">
            <h3 className="text-sm font-bold text-amber-200">Hold Basis</h3>
            <p className="text-xs text-agri-text-muted mt-1">
              Missing ownership or KYC docs, unclear location proof, or pending manual review.
            </p>
            <ul className="mt-2 text-[11px] text-on-surface-variant space-y-1">
              <li>Use hold when data is incomplete but not fraudulent</li>
              <li>Request correction with due date (default: 48 hours)</li>
              <li>Auto-escalate to reject if no response after due date</li>
            </ul>
          </div>
        </article>
        <article className="rounded-xl border border-red-300/25 bg-agri-card overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?w=900&q=80"
            alt=""
            className="w-full h-28 object-cover"
          />
          <div className="p-3">
            <h3 className="text-sm font-bold text-red-200">Reject Basis</h3>
            <p className="text-xs text-agri-text-muted mt-1">
              Identity mismatch, fake/invalid farm evidence, or suspicious profile inconsistencies.
            </p>
            <ul className="mt-2 text-[11px] text-on-surface-variant space-y-1">
              <li>Use reject for non-recoverable or high-risk discrepancies</li>
              <li>Record exact mismatch reason for audit compliance</li>
              <li>Notify applicant with rejection timestamp and evidence list</li>
            </ul>
          </div>
        </article>
      </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center min-h-[280px] text-agri-text-muted">
          Loading verification queue…
        </div>
      ) : mode === "farmers" && filteredFarmers.length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-[#161e2b] p-12 text-center text-agri-text-muted">
          No farmers found for this filter.
        </div>
      ) : mode === "photos" && filteredPhotos.length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-[#161e2b] p-12 text-center text-agri-text-muted">
          No pending crop photos found.
        </div>
      ) : mode === "farmers" ? (
        <div className="space-y-3">
          {filteredFarmers.map((f) => (
            <div
              key={f._id}
              className="rounded-xl border border-white/10 bg-[#161e2b] p-4 flex flex-wrap items-center gap-3"
            >
              <div className="min-w-[220px] flex-1">
                <p className="font-headline font-bold text-on-surface">{f.name}</p>
                <p className="text-xs text-agri-text-muted mt-1">{f.email}</p>
                <p className="text-[10px] uppercase tracking-wider text-agri-text-muted mt-2">
                  Registered {new Date(f.createdAt).toLocaleDateString()}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-agri-text-muted mt-1">
                  Last action {f.updatedAt ? new Date(f.updatedAt).toLocaleString() : "Not reviewed"}
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-white/15 text-on-surface-variant">
                {f.verificationStatus || "pending"}
              </span>
              {f.verificationRemark ? (
                <span className="text-[11px] text-agri-text-muted basis-full">
                  {f.verificationRemark}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => updateStatus(f._id, "approved")}
                className="px-3 py-2 rounded-lg bg-primary/20 border border-primary/40 text-primary text-xs font-bold"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => updateStatus(f._id, "hold")}
                className="px-3 py-2 rounded-lg bg-amber-400/10 border border-amber-300/40 text-amber-200 text-xs font-bold"
              >
                Hold
              </button>
              <button
                type="button"
                onClick={() => updateStatus(f._id, "rejected")}
                className="px-3 py-2 rounded-lg bg-red-400/10 border border-red-300/40 text-red-200 text-xs font-bold"
              >
                Reject
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPhotos.map((p) => (
            <div key={p._id} className="rounded-xl border border-white/10 bg-[#161e2b] p-4 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
              <div className="rounded-lg overflow-hidden border border-white/10 bg-black/20">
                <img src={p.imageUrl || p.raw?.photo_url} alt="proof" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-white/15 text-on-surface-variant">
                    {p.tag || p.raw?.stage || "STAGE"}
                  </span>
                  <span className="text-xs text-agri-text-muted">{p.location || "Project"}</span>
                </div>
                <p className="font-headline font-bold text-on-surface">{p.title || "Milestone proof"}</p>
                <p className="text-xs text-agri-text-muted mt-1">{p.notes || p.snippet || "Awaiting review"}</p>
                <p className="text-xs text-agri-text-muted mt-1">Farmer: {p.farmerName || "Farmer"}</p>

                <textarea
                  value={remarksByPhoto[p._id] || ""}
                  onChange={(e) => setRemarksByPhoto((prev) => ({ ...prev, [p._id]: e.target.value }))}
                  placeholder="Optional remarks"
                  className="w-full mt-3 px-3 py-2 rounded-lg bg-agri-bg-soft border border-white/10 text-sm min-h-[80px]"
                />

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={busyPhotoId === p._id}
                    onClick={() => verifyPhoto(p._id, "APPROVED")}
                    className="px-3 py-2 rounded-lg bg-primary/20 border border-primary/40 text-primary text-xs font-bold disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busyPhotoId === p._id}
                    onClick={() => verifyPhoto(p._id, "REJECTED")}
                    className="px-3 py-2 rounded-lg bg-red-400/10 border border-red-300/40 text-red-200 text-xs font-bold disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ConsoleShell>
  );
}
