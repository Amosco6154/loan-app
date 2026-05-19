import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../services/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await loginUser({ email, password });
      localStorage.setItem("user", JSON.stringify(response.user));
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials or server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden text-slate-800">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex flex-col items-center mb-6">
          {/* Brand Shield Logo */}
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 mb-3 border border-indigo-500/10">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <circle cx="12" cy="11" r="3" />
              <path d="M12 8v6M10 11h4" />
            </svg>
          </div>
          <div className="flex items-center justify-center">
            <span className="text-xl font-bold tracking-tight text-slate-900">QuickCash</span>
            <span className="text-xl font-light text-indigo-600"> Finance</span>
          </div>
          <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest mt-1">Admin Portal</p>
        </div>
        <h2 className="text-center text-2xl font-black text-slate-900 tracking-tight">Sign in to workspace</h2>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 sm:rounded-3xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-rose-50 text-rose-600 text-xs p-3 rounded-xl border border-rose-200 font-semibold">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Admin Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full px-4 py-3 bg-white border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-xs text-slate-800"
                placeholder="admin@loanmanager.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-4 py-3 bg-white border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-xs text-slate-800"
                placeholder="••••••••"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-100 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70 cursor-pointer"
              >
                {loading ? "Authorizing Security..." : "Sign in to Dashboard"}
              </button>
            </div>
          </form>

          {/* Direct link back to Landing page */}
          <div className="mt-6 border-t border-slate-100 pt-6 text-center">
            <Link
              to="/"
              className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-all flex items-center justify-center gap-1"
            >
              <span>←</span>
              <span>Back to Homepage</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}