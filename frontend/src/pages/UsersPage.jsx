import { useEffect, useState } from "react";
import { authApi } from "../services/api";

const ROLE_COLORS = {
  admin:    "bg-purple-500/20 text-purple-400",
  operator: "bg-blue-500/20 text-blue-400",
  viewer:   "bg-gray-500/20 text-gray-400",
};

export default function UsersPage() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await authApi.listUsers();
      setUsers(data.users ?? data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleRoleChange(id, role) {
    try {
      const updated = await authApi.updateRole(id, role);
      setUsers((prev) => prev.map((u) => u._id === id ? updated : u));
    } catch (e) { alert(e.message); }
  }

  async function handleDeactivate(id) {
    if (!confirm("Deactivate this user?")) return;
    try {
      await authApi.deactivate(id);
      load();
    } catch (e) { alert(e.message); }
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <h1 className="text-white text-xl font-bold mb-1">User Management</h1>
      <p className="text-gray-400 text-sm mb-5">Manage roles and access control</p>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      {loading
        ? <p className="text-gray-500">Loading…</p>
        : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
                  <th className="pb-2 text-left">User</th>
                  <th className="pb-2 text-left">Role</th>
                  <th className="pb-2 text-left">Status</th>
                  <th className="pb-2 text-left">Last Login</th>
                  <th className="pb-2 text-left">Joined</th>
                  <th className="pb-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className={`border-b border-gray-800 ${!u.isActive ? "opacity-40" : ""}`}>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        {u.avatar
                          ? <img src={u.avatar} className="w-7 h-7 rounded-full object-cover" alt="" />
                          : <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center text-xs text-white">{u.name[0]}</div>
                        }
                        <div>
                          <p className="text-white font-medium">{u.name}</p>
                          <p className="text-gray-500 text-xs">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">
                      <select value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full font-medium border-0 outline-none cursor-pointer ${ROLE_COLORS[u.role]}`}
                        style={{ background: "transparent" }}
                      >
                        <option value="viewer">viewer</option>
                        <option value="operator">operator</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`text-xs font-medium ${u.isActive ? "text-green-400" : "text-gray-500"}`}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-400 text-xs">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "Never"}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5">
                      {u.isActive && u.role !== "admin" && (
                        <button onClick={() => handleDeactivate(u._id)}
                          className="text-red-400 hover:underline text-xs">Deactivate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  );
}
