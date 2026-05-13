const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";


async function request(path, options = {}, token = null) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers, credentials: "include" });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err  = new Error(body.error || `API error ${res.status}`);
    err.status = res.status;
    throw err;
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("text/csv")) return res.blob();
  return res.json();
}

function getToken() {
  try {
    const raw = localStorage.getItem("telemetryx-auth");
    return raw ? JSON.parse(raw)?.state?.accessToken : null;
  } catch { return null; }
}

function setToken(accessToken) {
  try {
    const raw = localStorage.getItem("telemetryx-auth");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.state.accessToken = accessToken;
    localStorage.setItem("telemetryx-auth", JSON.stringify(parsed));
  } catch {}
}

async function authRequest(path, options = {}) {
  try {
    return await request(path, options, getToken());
  } catch (err) {
    if (err.status !== 401) throw err;

    try {
      const refreshed = await request("/auth/refresh", { method: "POST" });
      setToken(refreshed.accessToken);

      try {
        const { default: useAuthStore } = await import("../store/useAuthStore");
        const cur = useAuthStore.getState();
        useAuthStore.getState().setAuth(
          refreshed.user ?? cur.user,
          refreshed.accessToken,
          refreshed.house,
          refreshed.role  ?? cur.role,
          refreshed.memberships ?? cur.memberships
        );
      } catch {}

      return await request(path, options, refreshed.accessToken);
    } catch {
      try {
        const { default: useAuthStore } = await import("../store/useAuthStore");
        useAuthStore.getState().clearAuth();
      } catch {}
      const logoutErr = new Error("Session expired. Please log in again.");
      logoutErr.status = 401;
      throw logoutErr;
    }
  }
}


export const authApi = {
  listHouses:    ()           => request("/auth/houses"),
  getHouse:      (num)        => request(`/auth/houses/${num}`),
  register:      (data)       => request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login:         (data)       => request("/auth/login",    { method: "POST", body: JSON.stringify(data) }),
  refresh:       ()           => request("/auth/refresh",  { method: "POST" }),
  logout:        ()           => authRequest("/auth/logout", { method: "POST" }),
  me:            ()           => authRequest("/auth/me"),
  updateProfile: (d)          => authRequest("/auth/me",   { method: "PATCH", body: JSON.stringify(d) }),
  listUsers:   ()             => authRequest("/auth/users"),
  updateRole:  (id, role)     => authRequest(`/auth/users/${id}/role`,      { method: "PATCH", body: JSON.stringify({ role }) }),
  deactivate:  (id)           => authRequest(`/auth/users/${id}/deactivate`,{ method: "PATCH" }),
};


export const houseApi = {
  get:    ()           => authRequest("/house"),
  update: (houseName)  => authRequest("/house", { method: "PATCH", body: JSON.stringify({ houseName }) }),
};


export const fetchDevices = (params = "") => authRequest(`/devices${params}`);
export const fetchAlerts  = ()             => authRequest("/alerts");
export const fetchHistory = (deviceId, limit = 50) =>
  authRequest(`/devices/${deviceId}/history?limit=${limit}`);

export async function acknowledgeAlert(id) {
  return authRequest(`/alerts/${id}/acknowledge`, { method: "PATCH" });
}

export const deviceApi = {
  create:   (data)      => authRequest("/devices",               { method: "POST",   body: JSON.stringify(data) }),
  update:   (id, d)     => authRequest(`/devices/${id}`,         { method: "PATCH",  body: JSON.stringify(d) }),
  delete:   (id)        => authRequest(`/devices/${id}`,         { method: "DELETE" }),
  toggle:   (id)        => authRequest(`/devices/${id}/toggle`,  { method: "PATCH" }),
  getAudit: (id)        => authRequest(`/devices/${id}/audit`),
  getGraph: ()          => authRequest("/devices/graph"),
};


export const analyticsApi = {
  summary:   (range = "24h") => authRequest(`/analytics/summary?range=${range}`),
  telemetry: (range = "24h", deviceId = "") =>
    authRequest(`/analytics/telemetry?range=${range}${deviceId ? `&deviceId=${deviceId}` : ""}`),
  alerts:    (range = "24h") => authRequest(`/analytics/alerts?range=${range}`),
  uptime:    (range = "24h") => authRequest(`/analytics/uptime?range=${range}`),
  exportCsv: (range = "24h", deviceId = "") => {
    const url   = `${BASE}/analytics/export/csv?range=${range}${deviceId ? `&deviceId=${deviceId}` : ""}`;
    const token = getToken();
    return fetch(url, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then((r) => r.blob());
  },
};
