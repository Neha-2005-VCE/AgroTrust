import React from "react";

// Tailwind CSS and Google Fonts should be included in your index.html or main app entry.
// Material Symbols can be loaded via CDN in public/index.html for best results.

const LandingPage = () => (
  <div className="bg-surface text-on-surface font-body selection:bg-primary/30 min-h-screen">
    {/* Top Navigation Shell */}
    <nav className="fixed top-0 w-full z-50 border-b-2 border-emerald-500/30 bg-[#0b1326]/80 backdrop-blur-2xl flex justify-between items-center px-6 py-4 max-w-full">
      <div className="flex items-center gap-8">
        <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-500 to-emerald-300 font-headline">AgroTrust</span>
        <div className="hidden md:flex gap-8 items-center">
          <a className="text-emerald-400 border-b-2 border-emerald-400 pb-1 font-manrope tracking-tight font-bold text-lg" href="#">Marketplace</a>
          <a className="text-slate-400 hover:text-emerald-200 transition-colors font-manrope tracking-tight font-bold text-lg" href="#">Portfolio</a>
          <a className="text-slate-400 hover:text-emerald-200 transition-colors font-manrope tracking-tight font-bold text-lg" href="#">Console</a>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-400 hover:bg-emerald-500/10 transition-all duration-300 rounded-full">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="p-2 text-slate-400 hover:bg-emerald-500/10 transition-all duration-300 rounded-full">
          <span className="material-symbols-outlined">account_circle</span>
        </button>
      </div>
    </nav>
    <main className="pt-24">
      {/* Hero Section */}
      <section className="relative min-h-[921px] flex items-center px-6 lg:px-24 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-20%] left-[-5%] w-[400px] h-[400px] bg-emerald-900/40 rounded-full blur-[100px]"></div>
        </div>
        <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto w-full">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container/30 border border-primary/20 text-primary text-xs font-label uppercase tracking-widest">
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              Revolutionizing Agri-Fintech
            </div>
            <h1 className="text-5xl lg:text-7xl font-headline font-extrabold tracking-tight text-on-surface leading-[1.1]">
              Connecting Farmers Directly with <span className="text-transparent bg-clip-text growth-gradient">Customers</span>, Built on Trust
            </h1>
            <p className="text-on-surface-variant text-lg lg:text-xl max-w-xl leading-relaxed">
              The Digital Greenhouse brings transparency to the soil. Invest in sustainable harvests and track your impact through hyper-precise IoT monitoring.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <button className="px-8 py-4 rounded-xl growth-gradient text-on-primary font-headline font-bold text-lg hover:scale-105 transition-transform duration-300 shadow-[0_0_20px_rgba(78,222,163,0.3)]">
                Get Started
              </button>
              <button className="px-8 py-4 rounded-xl border border-outline-variant/30 text-on-surface font-headline font-bold text-lg hover:bg-white/5 transition-all">
                View Marketplace
              </button>
            </div>
          </div>
          <div className="relative group">
            <div className="absolute -inset-4 growth-gradient opacity-20 blur-2xl group-hover:opacity-30 transition duration-500"></div>
            <div className="glass-card rounded-xl p-6 relative overflow-hidden">
              <img className="w-full h-[450px] object-cover rounded-lg shadow-2xl" alt="Cinematic wide shot of a sustainable indoor hydroponic farm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCsws4cT92-jnOz8cOY5W2yC5hY0XET8Xtmqf8HRxZY7_bDgNo6sSdz74RlSzeTgv7IvqqDJKiscuvHHBBX2ogmM8m7QwUfA2Q9LY2e3uJClNuBc2b0ij3ZeWVjel5-j_tl1oTKE5IDhImPQgsIIEGkzcC3uJl-zG6xpVatDsU7MbBQJhWIEa4tty3IVzN98ld-ya95Ry9y2ngTpTRcykys07HiJzkEYhSI2I07shU_e0Vh9F7ciku7Qe-vZaka6NZ1MdoDoRWts8c" />
              <div className="absolute bottom-10 left-10 right-10 glass-card p-6 rounded-xl border-emerald-500/30">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-primary text-xs font-label uppercase tracking-widest mb-1">Live Asset</p>
                    <h3 className="text-2xl font-headline font-bold">Premium Wasabi Cultivar</h3>
                    <p className="text-on-surface-variant text-sm">Target Yield: 450kg • Expected 12% ROI</p>
                  </div>
                  <div className="h-12 w-12 rounded-full border-2 border-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">trending_up</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Trust Indicators Bento */}
      <section className="py-24 px-6 lg:px-24 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card p-8 rounded-xl flex flex-col gap-6 hover:translate-y-[-8px] transition-all duration-300">
            <div className="w-14 h-14 rounded-xl bg-primary-container/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-3xl">verified_user</span>
            </div>
            <h3 className="text-2xl font-headline font-bold text-on-surface">Secure Payments</h3>
            <p className="text-on-surface-variant leading-relaxed">Encrypted ledger transactions ensuring that every cent is accounted for from investor to soil.</p>
          </div>
          <div className="glass-card p-8 rounded-xl flex flex-col gap-6 hover:translate-y-[-8px] transition-all duration-300">
            <div className="w-14 h-14 rounded-xl bg-primary-container/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-3xl">task_alt</span>
            </div>
            <h3 className="text-2xl font-headline font-bold text-on-surface">Verified Milestones</h3>
            <p className="text-on-surface-variant leading-relaxed">Funds are released only when specific biological and logistical milestones are met and verified by IoT sensors.</p>
          </div>
          <div className="glass-card p-8 rounded-xl flex flex-col gap-6 hover:translate-y-[-8px] transition-all duration-300">
            <div className="w-14 h-14 rounded-xl bg-primary-container/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-3xl">visibility</span>
            </div>
            <h3 className="text-2xl font-headline font-bold text-on-surface">Transparent Supply Chain</h3>
            <p className="text-on-surface-variant leading-relaxed">Real-time tracking of produce from the greenhouse to the customer's doorstep with full documentation.</p>
          </div>
        </div>
      </section>
      {/* ...additional sections can be added here following the same pattern... */}
    </main>
    {/* Footer Shell */}
    <footer className="w-full py-12 mt-auto bg-[#0b1326] flex flex-col md:flex-row justify-between items-center px-12 border-t border-white/5">
      <p className="font-inter text-xs uppercase tracking-widest text-slate-600">© 2024 AgroTrust The Digital Greenhouse. All rights reserved.</p>
      <div className="flex gap-8 mt-6 md:mt-0">
        <a className="font-inter text-xs uppercase tracking-widest text-slate-600 hover:text-emerald-300 transition-colors" href="#">Privacy Policy</a>
        <a className="font-inter text-xs uppercase tracking-widest text-slate-600 hover:text-emerald-300 transition-colors" href="#">Terms of Service</a>
        <a className="font-inter text-xs uppercase tracking-widest text-slate-600 hover:text-emerald-300 transition-colors" href="#">Sustainability Report</a>
      </div>
    </footer>
  </div>
);

export default LandingPage;
