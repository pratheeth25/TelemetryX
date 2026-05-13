import useAuthStore from "../store/useAuthStore";

export default function RoleGuard({ roles, children }) {
  const { user, role } = useAuthStore();

  if (!user || !roles.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <span className="text-4xl">🚫</span>
        <p className="text-white font-semibold">Access Denied</p>
        <p className="text-gray-400 text-sm">
          Your role (<strong>{role || "guest"}</strong>) does not have permission to view this page.
        </p>
      </div>
    );
  }

  return children;
}
