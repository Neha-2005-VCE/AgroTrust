import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { getStoredUser } from "../services/api";

function sidebarForRole(role) {
  if (role === "buyer") {
    return [
      { id: "dashboard", label: "Dashboard", icon: "dashboard", to: "/buyer/dashboard" },
      { id: "marketplace", label: "Marketplace", icon: "storefront", to: "/buyer/dashboard" },
      { id: "orders", label: "Orders", icon: "receipt_long", to: "/buyer/dashboard" },
      { id: "settings", label: "Settings", icon: "settings", to: "/settings" },
    ];
  }
  if (role === "investor") {
    return [
      { id: "dashboard", label: "Dashboard", icon: "dashboard", to: "/investor/dashboard" },
      { id: "portfolio", label: "Portfolio", icon: "monitoring", to: "/investor/dashboard" },
      { id: "reports", label: "Reports", icon: "bar_chart", to: "/investor/dashboard" },
      { id: "marketplace", label: "Marketplace", icon: "storefront", to: "/marketplace" },
      { id: "settings", label: "Settings", icon: "settings", to: "/settings" },
    ];
  }
  if (role === "expert" || role === "admin") {
    return [
      { id: "verification", label: "Admin", icon: "admin_panel_settings", to: "/admin/dashboard" },
      { id: "queue", label: "Verification", icon: "fact_check", to: "/admin/verification" },
      { id: "marketplace", label: "Marketplace", icon: "storefront", to: "/marketplace" },
      { id: "settings", label: "Settings", icon: "settings", to: "/settings" },
    ];
  }
  // farmer (default)
  return [
    { id: "dashboard", label: "Dashboard", icon: "dashboard", to: "/farmer/dashboard" },
    { id: "portfolio", label: "Portfolio", icon: "monitoring", to: "/farmer/dashboard" },
    { id: "projects", label: "Projects", icon: "inventory_2", to: "/farmer/dashboard" },
    { id: "milestones", label: "Milestones", icon: "timeline", to: "/farmer/dashboard" },
    { id: "reports", label: "Reports", icon: "bar_chart", to: "/farmer/dashboard" },
    { id: "marketplace", label: "Marketplace", icon: "storefront", to: "/marketplace" },
    { id: "settings", label: "Settings", icon: "settings", to: "/settings" },
  ];
}

function topNavForRole(role) {
  if (role === "buyer") {
    return [
      { key: "buyer", label: "Dashboard", to: "/buyer/dashboard" },
      { key: "marketplace", label: "Marketplace", to: "/buyer/dashboard" },
      { key: "settings", label: "Settings", to: "/settings" },
    ];
  }
  if (role === "investor") {
    return [
      { key: "dashboard", label: "Dashboard", to: "/investor/dashboard" },
      { key: "marketplace", label: "Marketplace", to: "/marketplace" },
      { key: "settings", label: "Settings", to: "/settings" },
    ];
  }
  if (role === "expert" || role === "admin") {
    return [
      { key: "verification", label: "Admin", to: "/admin/dashboard" },
      { key: "queue", label: "Verification", to: "/admin/verification" },
      { key: "marketplace", label: "Marketplace", to: "/marketplace" },
      { key: "settings", label: "Settings", to: "/settings" },
    ];
  }
  // farmer (default)
  return [
    { key: "marketplace", label: "Marketplace", to: "/marketplace" },
    { key: "console", label: "Console", to: "/farmer/dashboard" },
    { key: "settings", label: "Settings", to: "/settings" },
  ];
}

export default function ConsoleShell({
  children,
  activeTop = "console",
  activeSidebar = "dashboard",
  pageTitle,
  pageTitleAccent,
  pageSubtitle,
  userName,
  showSidebar = true,
  omitPageHeader = false,
  searchPlaceholder = "Search yields...",
  showTopSearch = true,
  topSearchValue,
  onTopSearchChange,
}) {
  const navigate = useNavigate();
  const stored = getStoredUser();
  const displayName = userName ?? stored?.name ?? "User";
  const role = stored?.role?.toLowerCase();
  const sidebarItems = sidebarForRole(role);
  const topNavItems = topNavForRole(role);
  const searchControlled =
    topSearchValue !== undefined && typeof onTopSearchChange === "function";
  const topClass = (key) =>
    `text-sm font-semibold tracking-tight pb-1 border-b-2 transition-colors ${
      activeTop === key
        ? "text-primary border-primary"
        : "text-on-surface-variant border-transparent hover:text-primary/90"
    }`;

  return (
    <div className="min-h-screen bg-agri-bg text-on-surface font-body flex flex-col">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-agri-bg/95 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 lg:px-8 h-16 max-w-[1600px] mx-auto w-full">
          <Link
            to="/"
            className="text-xl font-extrabold font-headline text-primary tracking-tight shrink-0"
          >
            AgroTrust
          </Link>
          <nav className="hidden md:flex items-center gap-10 absolute left-1/2 -translate-x-1/2">
            {topNavItems.map((item) => (
              <Link key={item.key} to={item.to} className={topClass(item.key)}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            {showTopSearch && (
            <div className="hidden lg:flex items-center rounded-full bg-[#161e2b] border border-white/10 px-3 py-2 w-52 xl:w-64">
              <span className="material-symbols-outlined text-on-surface-variant text-xl mr-2 shrink-0">search</span>
              <input
                type="search"
                placeholder={searchPlaceholder}
                {...(searchControlled
                  ? {
                      value: topSearchValue,
                      onChange: (e) => onTopSearchChange(e.target.value),
                    }
                  : {})}
                className="bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none w-full min-w-0"
              />
            </div>
            )}
            <button
              type="button"
              className="p-2 rounded-full text-on-surface-variant hover:bg-white/5 transition-colors"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
            </button>
            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:border-primary/40 hover:bg-white/5 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">settings</span>
              Settings
            </Link>
            <div className="flex items-center gap-2 pl-1">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/40 to-agri-card border border-primary/30" />
              <span className="hidden sm:inline text-sm font-medium text-on-surface">{displayName}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 max-w-[1600px] mx-auto w-full">
        {showSidebar && (
        <aside className="hidden lg:flex w-64 flex-col border-r border-white/5 bg-[#161e2b]/90 shrink-0">
          <div className="p-6 pb-4">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-agri-text-muted uppercase">
              {role === "investor" ? "Investor Console" : role === "expert" || role === "admin" ? "Expert Console" : "Field Console"}
            </p>
            <p className="text-sm font-headline font-bold text-on-surface mt-1">AgroTrust Pro</p>
          </div>
          <nav className="flex-1 px-3 space-y-1">
            {sidebarItems.map((item) => {
              const active = activeSidebar === item.id;
              return (
                <NavLink
                  key={item.id}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors relative ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface"
                  }`}
                >
                  {active && (
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-l-full" />
                  )}
                  <span
                    className={`material-symbols-outlined text-[22px] ${active ? "" : "opacity-80"}`}
                    style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
          <div className="p-4 mt-auto space-y-3 border-t border-white/5">
            <div className="rounded-xl bg-agri-bg-soft p-4 border border-primary/15">
              <p className="text-xs text-on-surface-variant mb-3">Unlock advanced IoT analytics</p>
              <button
                type="button"
                className="w-full py-2.5 rounded-lg growth-gradient text-on-primary text-xs font-bold uppercase tracking-wide"
              >
                Upgrade Plan
              </button>
            </div>
            <button
              type="button"
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-white/5"
            >
              <span className="material-symbols-outlined text-xl">help</span>
              Support
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                navigate("/login");
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-on-surface-variant hover:text-red-400 rounded-lg hover:bg-white/5 text-left"
            >
              <span className="material-symbols-outlined text-xl">logout</span>
              Logout
            </button>
          </div>
        </aside>
        )}

        <main className="flex-1 flex flex-col min-w-0 bg-[#0a111a]">
          {!omitPageHeader && (pageTitle || pageSubtitle) && (
            <div className="px-4 sm:px-8 pt-8 pb-2">
              {pageTitle && (
                <h1 className="text-2xl sm:text-3xl font-headline font-extrabold tracking-tight">
                  {pageTitle}
                  {pageTitleAccent && (
                    <span className="text-primary"> {pageTitleAccent}</span>
                  )}
                </h1>
              )}
              {pageSubtitle && (
                <p className="text-sm text-agri-text-muted mt-1">{pageSubtitle}</p>
              )}
            </div>
          )}
          <div className={`flex-1 px-4 sm:px-8 pb-8 ${omitPageHeader ? "pt-8" : "pt-4"}`}>{children}</div>
        </main>
      </div>

      <footer className="border-t border-white/5 py-6 px-4 sm:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-widest text-agri-text-muted max-w-[1600px] mx-auto w-full">
        <span>© 2024 AgroTrust The Digital Greenhouse. All rights reserved.</span>
        <div className="flex flex-wrap justify-center gap-6">
          <Link to="/login" className="hover:text-primary transition-colors">
            Privacy Policy
          </Link>
          <Link to="/login" className="hover:text-primary transition-colors">
            Terms of Service
          </Link>
          <Link to="/login" className="underline decoration-primary/60 hover:text-primary">
            Sustainability Report
          </Link>
        </div>
      </footer>
    </div>
  );
}
