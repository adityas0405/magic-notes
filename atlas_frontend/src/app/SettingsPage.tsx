import { apiBaseUrl } from "../lib/api";

const SettingsPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
        <h2 className="text-sm font-semibold">Profile</h2>
        <p className="mt-2 text-sm text-muted">John Doe · john@example.com</p>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
        <h2 className="text-sm font-semibold">API Base URL</h2>
        <p className="mt-2 text-sm text-muted">{apiBaseUrl}</p>
      </div>
    </div>
  );
};

export default SettingsPage;
