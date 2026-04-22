import React from "react";
import { Link, useNavigate } from "react-router-dom";

function IoTStat({ icon, value, label, barPct, barTone = "primary" }) {
  const bar =
    barTone === "muted"
      ? "bg-white/25"
      : barTone === "soft"
        ? "bg-primary/70"
        : "bg-primary";
  return (
    <div className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="material-symbols-outlined text-primary text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-headline font-extrabold tracking-tight mb-1">{value}</p>
      <p className="text-sm text-agri-text-muted mb-4">{label}</p>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-auto">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${barPct}%` }} />
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="bg-agri-bg text-on-surface min-h-screen flex flex-col font-body">
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-agri-bg/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-4 sm:px-8 h-16">
          <div className="flex items-center gap-8 lg:gap-12">
            <span className="text-xl font-extrabold font-headline text-primary tracking-tight">
              AgroTrust
            </span>
            <div className="hidden md:flex gap-8 items-center">
              <Link
                to="/marketplace"
                className="text-sm font-semibold text-primary border-b-2 border-primary pb-0.5"
              >
                Marketplace
              </Link>
              <Link
                to="/investor/dashboard"
                className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors"
              >
                Portfolio
              </Link>
              <Link
                to="/farmer/dashboard"
                className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors"
              >
                Console
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              className="p-2 text-on-surface-variant hover:bg-white/5 rounded-full transition-colors"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
            </button>
            <button
              type="button"
              className="p-2 text-on-surface-variant hover:bg-white/5 rounded-full transition-colors"
              onClick={() => navigate("/login")}
              aria-label="Account"
            >
              <span className="material-symbols-outlined text-[22px]">account_circle</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-16 flex-1">
        <section className="relative px-4 sm:px-8 lg:px-16 py-16 lg:py-24 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(900px,120vw)] h-[min(900px,120vw)] bg-primary/10 rounded-full blur-[140px]" />
            <div className="absolute top-[-10%] right-[-5%] w-[min(500px,80vw)] h-[min(500px,80vw)] bg-primary/8 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[380px] h-[380px] bg-emerald-900/25 rounded-full blur-[90px]" />
          </div>
          <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
            <div className="space-y-8">
              <p className="text-xs font-bold tracking-[0.25em] text-primary uppercase">
                Revolutionizing Agri-Fintech
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-headline font-extrabold tracking-tight leading-[1.08] text-on-surface">
                Connecting Farmers Directly with <span className="text-primary">Customers</span>, Built on Trust
              </h1>
              <p className="text-on-surface-variant text-lg max-w-xl leading-relaxed">
                The Digital Greenhouse brings transparency to the soil. Invest in sustainable harvests and track your
                impact through hyper-precise IoT monitoring.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  type="button"
                  className="px-8 py-3.5 rounded-xl growth-gradient text-on-primary font-headline font-bold shadow-lg hover:opacity-95 transition-opacity"
                  onClick={() => navigate("/login")}
                >
                  Get Started
                </button>
                <button
                  type="button"
                  className="px-8 py-3.5 rounded-xl border-2 border-primary/40 text-on-surface font-headline font-semibold bg-transparent hover:bg-primary/10 transition-colors"
                  onClick={() => navigate("/marketplace")}
                >
                  View Marketplace
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-3 bg-primary/20 rounded-3xl blur-2xl opacity-60" />
              <div className="relative glass-card rounded-3xl p-2 sm:p-3 border border-primary/20 botanical-shadow">
                <div className="rounded-2xl overflow-hidden relative">
                  <img
                    className="w-full h-[min(420px,50vh)] sm:h-[460px] object-cover"
                    alt="Indoor vertical farm with grow lights"
                    src="https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=900&q=80"
                  />
                  <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm glass-panel rounded-xl p-4 border border-primary/30 botanical-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-primary text-[9px] font-bold uppercase tracking-[0.2em] mb-1.5">Live data</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-headline font-bold text-on-surface leading-tight">
                            Premium Wasabi
                            <span className="text-primary"> | </span>
                            <span className="text-on-surface">Cultivar</span>
                          </h3>
                          <span className="material-symbols-outlined text-primary text-xl shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                            verified
                          </span>
                        </div>
                        <p className="text-on-surface-variant text-xs mt-2">
                          Kyoto vertical farm • Verified yield curve
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-8 lg:px-16 max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {[
              { icon: "shield", title: "Secure Payments", text: "Escrow and milestone-based releases keep capital aligned with verified field progress." },
              { icon: "task_alt", title: "Verified Milestones", text: "IoT telemetry and photo proof unlock funds only when biology and logistics match the plan." },
              { icon: "visibility", title: "Transparent Supply Chain", text: "Trace produce from greenhouse to doorstep with documentation investors and buyers can trust." },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/8 bg-agri-card p-8 botanical-shadow hover:border-primary/20 transition-colors"
              >
                <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-primary text-2xl">{f.icon}</span>
                </div>
                <h3 className="text-xl font-headline font-bold mb-3">{f.title}</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-20 px-4 sm:px-8 lg:px-16 max-w-7xl mx-auto border-t border-white/5">
          <h2 className="text-3xl font-headline font-extrabold text-center mb-14">The Seed-to-Success Journey</h2>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              {[
                { title: "Select Your Crop", text: "Browse the marketplace for verified crops and projects aligned to your region." },
                { title: "Fund the Growth", text: "Provide capital for seeds, inputs, and operations with milestone-gated releases." },
                { title: "Monitor Real-Time", text: "Open the Field IoT console for live soil, climate, and growth telemetry." },
              ].map((step, i) => (
                <div key={step.title} className="flex gap-4">
                  <div className="w-11 h-11 rounded-full bg-primary text-on-primary font-headline font-extrabold flex items-center justify-center shrink-0 text-sm shadow-lg shadow-primary/20">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="font-headline font-bold text-lg">{step.title}</h4>
                    <p className="text-on-surface-variant text-sm mt-1 leading-relaxed">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="relative min-h-[280px] sm:min-h-[340px]">
              <img
                src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80"
                alt="Greenhouse at sunset"
                className="rounded-2xl h-56 sm:h-72 w-[88%] object-cover border border-white/10 shadow-xl absolute top-0 left-0 z-0"
              />
              <img
                src="https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&q=80"
                alt="Seedling with sensor probe"
                className="rounded-2xl h-56 sm:h-72 w-[78%] object-cover border border-primary/20 shadow-2xl absolute bottom-0 right-0 z-10 ring-2 ring-primary/20"
              />
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-8 lg:px-16 max-w-7xl mx-auto border-t border-white/5">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-headline font-extrabold mb-4">Field IoT Console</h2>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Surface the signals that matter — soil, climate, and nutrient balance in one glance.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <IoTStat icon="monitor_heart" value="84.2%" label="Crop Health Index" barPct={84} />
            <IoTStat icon="thermostat" value="24.5°C" label="Greenhouse Temp" barPct={72} barTone="soft" />
            <IoTStat icon="water_drop" value="52%" label="Relative Humidity" barPct={52} barTone="muted" />
            <IoTStat icon="science" value="6.4 pH" label="Soil Acidity" barPct={64} />
          </div>
        </section>

        <section className="py-20 px-4 sm:px-8 lg:px-16 max-w-7xl mx-auto border-t border-white/5">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-6">
              <h2 className="text-2xl font-headline font-extrabold mb-2">Trusted by Modern Pioneers</h2>
              <figure className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
                <blockquote className="font-serif text-on-surface-variant italic text-lg leading-relaxed">
                  “AgroTrust helped us secure funding and track our greenhouse’s health in real time. Our customers love the
                  transparency.”
                </blockquote>
                <figcaption className="flex items-center gap-3 mt-6">
                  <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="" className="w-11 h-11 rounded-full border border-white/10" />
                  <div>
                    <p className="font-headline font-bold text-sm">David Chen</p>
                    <p className="text-xs text-agri-text-muted">Vertical Farmer</p>
                  </div>
                </figcaption>
              </figure>
              <figure className="rounded-2xl border border-white/8 bg-agri-card p-6 botanical-shadow">
                <blockquote className="font-serif text-on-surface-variant italic text-lg leading-relaxed">
                  “Once I saw the IoT console and milestone verification, I knew my investment was safe and impactful.”
                </blockquote>
                <figcaption className="flex items-center gap-3 mt-6">
                  <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="" className="w-11 h-11 rounded-full border border-white/10" />
                  <div>
                    <p className="font-headline font-bold text-sm">Laura Jenkins</p>
                    <p className="text-xs text-agri-text-muted">Agri Investor</p>
                  </div>
                </figcaption>
              </figure>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <img src="https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&q=80" alt="Produce" className="rounded-2xl h-36 sm:h-44 object-cover w-full border border-white/10" />
              <img src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&q=80" alt="Lab team" className="rounded-2xl h-36 sm:h-44 object-cover w-full border border-white/10" />
              <img src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&q=80" alt="Greenhouse" className="rounded-2xl h-36 sm:h-44 object-cover w-full border border-white/10" />
              <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80" alt="Team" className="rounded-2xl h-36 sm:h-44 object-cover w-full border border-white/10" />
            </div>
          </div>
        </section>

        <section className="relative py-24 px-4 text-center border-t border-white/5 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[min(600px,100%)] h-[200px] bg-primary/8 rounded-full blur-[80px]" />
          </div>
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-headline font-extrabold leading-tight text-on-surface">
              Ready to join the{" "}
              <span className="text-primary">Digital Greenhouse</span>?
            </h2>
            <p className="text-on-surface-variant text-sm sm:text-base mt-4 leading-relaxed">
              Kick-start your journey today—support local agriculture, track every growth milestone, and watch your impact
              bloom.
            </p>
            <button
              type="button"
              className="mt-10 px-12 py-4 rounded-xl growth-gradient text-on-primary font-headline font-bold text-lg hover:opacity-95 transition-opacity"
              onClick={() => navigate("/login")}
            >
              Get Started
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-8 px-4 sm:px-8 flex flex-col md:flex-row justify-between items-center gap-6 max-w-7xl mx-auto w-full text-[10px] uppercase tracking-widest text-agri-text-muted">
        <p>© 2024 AgroTrust The Digital Greenhouse. All rights reserved.</p>
        <div className="flex flex-wrap justify-center gap-8">
          <Link to="/login" className="hover:text-primary transition-colors">
            Privacy Policy
          </Link>
          <Link to="/login" className="hover:text-primary transition-colors">
            Terms of Service
          </Link>
          <Link to="/login" className="hover:text-primary transition-colors underline decoration-primary/50">
            Sustainability Report
          </Link>
        </div>
      </footer>
    </div>
  );
}
