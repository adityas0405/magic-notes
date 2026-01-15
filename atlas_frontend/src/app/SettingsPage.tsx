import { useState } from "react";
import { apiBaseUrl, getApiErrorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useChangePassword } from "../lib/queries";

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const displayName = user?.email ? user.email.split("@")[0] : "Atlas User";
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChangePassword = async () => {
    setFormError(null);
    setSuccessMessage(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setFormError("Please fill out all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("New passwords do not match.");
      return;
    }
    try {
      await changePassword.mutateAsync({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMessage("Password updated.");
    } catch (error) {
      setFormError(getApiErrorMessage(error, "Unable to update password."));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
        <h2 className="text-sm font-semibold">Profile</h2>
        <p className="mt-2 text-sm text-muted">
          {displayName} · {user?.email ?? "Signed in"}
        </p>
        <button
          className="mt-4 rounded-xl border border-border px-4 py-2 text-xs text-muted"
          onClick={logout}
          type="button"
        >
          Log out
        </button>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
        <h2 className="text-sm font-semibold">Change Password</h2>
        <div className="mt-4 space-y-3">
          <input
            className="w-full rounded-xl border border-border bg-base px-3 py-2 text-sm"
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          <input
            className="w-full rounded-xl border border-border bg-base px-3 py-2 text-sm"
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <input
            className="w-full rounded-xl border border-border bg-base px-3 py-2 text-sm"
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          {formError ? <p className="text-xs text-red-500">{formError}</p> : null}
          {successMessage ? (
            <p className="text-xs text-emerald-600">{successMessage}</p>
          ) : null}
          {changePassword.isError ? (
            <p className="text-xs text-red-500">
              {getApiErrorMessage(changePassword.error, "Password update failed.")}
            </p>
          ) : null}
          <button
            className="rounded-xl bg-primary px-4 py-2 text-xs text-white"
            onClick={handleChangePassword}
            type="button"
            disabled={changePassword.isPending}
          >
            {changePassword.isPending ? "Updating…" : "Update Password"}
          </button>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
        <h2 className="text-sm font-semibold">API Base URL</h2>
        <p className="mt-2 text-sm text-muted">{apiBaseUrl}</p>
      </div>
    </div>
  );
};

export default SettingsPage;
