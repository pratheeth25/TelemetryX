import { useState, useEffect, useCallback } from "react";
import { authApi } from "../services/api";
import useAuthStore from "../store/useAuthStore";

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function LoginPage() {
  const { setAuth } = useAuthStore();
  const [mode, setMode]     = useState("login"); // "login" | "register"
  const [form, setForm]     = useState({ name: "", email: "", password: "", houseNumber: "", activationCode: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const [houseInfo, setHouseInfo]       = useState(null);
  const [houseLoading, setHouseLoading] = useState(false);
  const [houseError, setHouseError]     = useState("");
  const debouncedHouseNum = useDebounce(form.houseNumber, 500);

  useEffect(() => {
    if (mode !== "register" || !debouncedHouseNum.trim()) {
      setHouseInfo(null); setHouseError(""); return;
    }
    setHouseLoading(true); setHouseError("");
    authApi.getHouse(debouncedHouseNum.toUpperCase())
      .then((h) => { setHouseInfo(h); setHouseLoading(false); })
      .catch(() => { setHouseInfo(null); setHouseError("House not found"); setHouseLoading(false); });
  }, [debouncedHouseNum, mode]);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      let res;
      if (mode === "login") {
        res = await authApi.login({ email: form.email, password: form.password });
      } else {
        res = await authApi.register({
          name: form.name, email: form.email, password: form.password,
          houseNumber: form.houseNumber.toUpperCase(),
          activationCode: form.activationCode.toUpperCase(),
        });
      }
      setAuth(res.user, res.accessToken, res.house, res.role, res.memberships);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally { setLoading(false); }
  }

  const roleTag = houseInfo?.hasOwner
    ? { label: "Viewer", color: "text-slate-400 bg-slate-400/10", note: "House already has an owner — you will join as Viewer" }
    : { label: "Admin", color: "text-violet-400 bg-violet-400/10", note: "No owner yet — you will become the Admin of this house" };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/30">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">TelemetryX</h1>
          <p className="text-gray-500 text-sm mt-1">IoT Smart Home Monitoring</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
          {/* Mode tabs */}
          <div className="flex rounded-xl bg-gray-800 p-1 mb-6">
            {["login", "register"].map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(""); setHouseInfo(null); setHouseError(""); }}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  mode === m ? "bg-gray-700 text-white shadow" : "text-gray-500 hover:text-gray-300"
                }`}>
                {m === "login" ? "Sign In" : "Join a House"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name (register only) */}
            {mode === "register" && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Full Name</label>
                <input name="name" value={form.name} onChange={handleChange} required
                  placeholder="Your name"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"/>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required
                placeholder="you@example.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"/>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} required
                placeholder="Your password"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"/>
            </div>

            {/* Register-specific fields */}
            {mode === "register" && (
              <>
                {/* House Number */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">House Number</label>
                  <div className="relative">
                    <input name="houseNumber" value={form.houseNumber} onChange={handleChange} required
                      placeholder="e.g. H001"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors uppercase"/>
                    {houseLoading && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="animate-spin w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                      </span>
                    )}
                  </div>
                  {/* House info preview */}
                  {houseInfo && (
                    <div className="mt-2 p-3 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">{houseInfo.houseName}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{houseInfo.hasOwner ? "Has an owner" : "No owner yet"}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${roleTag.color}`}>
                        {roleTag.label}
                      </span>
                    </div>
                  )}
                  {houseInfo && (
                    <p className="text-xs text-gray-500 mt-1.5">{roleTag.note}</p>
                  )}
                  {houseError && <p className="text-red-400 text-xs mt-1">{houseError}</p>}
                </div>

                {/* Activation Code */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Activation Code
                  </label>
                  <input name="activationCode" value={form.activationCode} onChange={handleChange} required
                    placeholder="8-character code"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors font-mono uppercase tracking-widest"/>
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/30 border border-red-700/40">
                <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/20">
              {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-5 pt-5 border-t border-gray-800">
            <p className="text-gray-600 text-xs text-center">
              Enter your house number and the activation code provided by your admin.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
