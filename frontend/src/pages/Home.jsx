import { Link } from "react-router-dom";

const features = [
  {
    icon: "🗄️",
    title: "Centralised Data Storage",
    desc: "Store all borrower records, loan details, and repayment histories in one secure, organised system."
  },
  {
    icon: "⚡",
    title: "Instant Eligibility Checks",
    desc: "Run built-in or third-party credit assessments to instantly determine if a borrower qualifies for a loan."
  },
  {
    icon: "🔗",
    title: "Universal Integration",
    desc: "Designed to plug into any institution — banks, SACCOs, microfinanciers, or individual lenders."
  },
  {
    icon: "🔒",
    title: "Secure & Compliant",
    desc: "Role-based access ensures your sensitive financial data is only accessible to authorised administrators."
  }
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white font-sans flex flex-col overflow-hidden">
      {/* Animated background blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-700 rounded-full blur-[120px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-amber-500 rounded-full blur-[120px] opacity-10 animate-pulse"></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex justify-between items-center px-8 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center border border-indigo-500/25 shadow-md shadow-indigo-900/30">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <circle cx="12" cy="11" r="3" />
              <path d="M12 8v6M10 11h4" />
            </svg>
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white">QuickCash</span>
            <span className="text-xl font-light text-amber-400"> Finance</span>
          </div>
        </div>
        <Link
          to="/login"
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-900/30"
        >
          Admin Login →
        </Link>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center text-center px-6 py-24 space-y-8">
        <span className="px-4 py-1.5 text-xs font-semibold uppercase tracking-widest bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 rounded-full">
          Universal Lending Data Platform
        </span>
        
        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight max-w-4xl tracking-tight">
          Smarter Lending Starts with
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-amber-400">
            Better Data
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-white/60 max-w-2xl leading-relaxed">
          QuickCash Finance is a universal lending data management system built for banks, SACCOs, 
          microfinanciers, and individual lenders — making borrower records, loan tracking, and 
          credit assessments effortless.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg rounded-2xl transition-all shadow-xl shadow-indigo-900/40 transform hover:-translate-y-0.5"
          >
            Access Admin Dashboard
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-lg rounded-2xl transition-all"
          >
            Learn More ↓
          </a>
        </div>
      </main>

      {/* Features */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto w-full px-6 pb-24">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-all">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-white text-base mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-6 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} QuickCash Finance. All rights reserved. | Universal Lending Data Platform
      </footer>
    </div>
  );
}
