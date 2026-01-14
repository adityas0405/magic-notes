import { apiBaseUrl } from "../lib/api";
import { useAuth } from "../lib/auth";

const SettingsPage = () => {
  const { user } = useAuth();
  const displayName = user?.email ? user.email.split("@")[0] : "Atlas User";
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
        <h2 className="text-sm font-semibold">Profile</h2>
        <p className="mt-2 text-sm text-muted">
          {displayName} · {user?.email ?? "Signed in"}
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
        <h2 className="text-sm font-semibold">API Base URL</h2>
        <p className="mt-2 text-sm text-muted">{apiBaseUrl}</p>
      </div>
    </div>
  );
};

export default SettingsPage;
