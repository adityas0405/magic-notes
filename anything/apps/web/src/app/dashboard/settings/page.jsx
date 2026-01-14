"use client";

import { User, Bell, Lock, Palette } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-slate-900 mb-3">Settings</h1>
      <p className="text-lg text-slate-600 mb-12">
        Manage your account and preferences
      </p>

      <div className="space-y-6">
        {/* Profile Settings */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                defaultValue="John Doe"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                type="email"
                defaultValue="john@example.com"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-900">
              Notifications
            </h2>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-teal-600 rounded"
              />
              <span className="text-sm text-slate-700">
                Email notifications for new study reminders
              </span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-teal-600 rounded"
              />
              <span className="text-sm text-slate-700">
                Weekly progress summaries
              </span>
            </label>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-900">Security</h2>
          </div>
          <button className="px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors">
            Change Password
          </button>
        </div>

        {/* Appearance */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Palette className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-900">Appearance</h2>
          </div>
          <p className="text-sm text-slate-600">
            Theme customization coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
