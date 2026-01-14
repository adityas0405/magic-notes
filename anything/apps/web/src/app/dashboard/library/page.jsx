"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Calendar,
  FileText,
  FolderOpen,
  Book,
  ArrowLeft,
  Atom,
  Leaf,
  Beaker,
  Globe,
} from "lucide-react";

import { apiFetch } from "../../../utils/api";

export default function LibraryPage() {
  const [selectedNotebook, setSelectedNotebook] = useState(null);
  const [showNewSubjectModal, setShowNewSubjectModal] = useState(false);
  const [showNewNotebookModal, setShowNewNotebookModal] = useState(false);

  const { data: libraryData, isLoading: subjectsLoading } = useQuery({
    queryKey: ["library"],
    queryFn: async () => {
      const response = await apiFetch("/api/library");
      return response.json();
    },
  });

  const subjects = libraryData?.notebooks || [];

  const { data: notebooks, isLoading: notebooksLoading } = useQuery({
    queryKey: ["notes", selectedNotebook?.id],
    queryFn: async () => {
      const response = await apiFetch(`/api/notebooks/${selectedNotebook.id}/notes`);
      return response.json();
    },
    enabled: !!selectedNotebook,
  });

  const getIconComponent = (iconName) => {
    const icons = { Atom, Leaf, Beaker, Globe };
    return icons[iconName] || FolderOpen;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (selectedNotebook) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-12">
        <button
          onClick={() => setSelectedNotebook(null)}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Subjects
        </button>

        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            {(() => {
              const Icon = getIconComponent(selectedNotebook.icon);
              return (
                <Icon
                  className="w-10 h-10"
                  style={{ color: selectedNotebook.color }}
                />
              );
            })()}
            <h1 className="text-4xl font-bold text-slate-900">
              {selectedNotebook.name}
            </h1>
          </div>
          <p className="text-lg text-slate-600">
            Your notebooks and study materials
          </p>
        </div>

        <div className="mb-8">
          <button
            onClick={() => setShowNewNotebookModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            New Notebook
          </button>
        </div>

        {notebooksLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse"
              >
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-3"></div>
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {notebooks?.map((notebook) => (
              <a
                key={notebook.id}
                href={`/dashboard/notebook/${notebook.id}`}
                className="group block bg-white rounded-xl border border-slate-200 p-6 hover:border-teal-300 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Book className="w-6 h-6 text-teal-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-teal-700 transition-colors">
                        {notebook.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span>Last edited {formatDate(notebook.updated_at)}</span>
                        <span>•</span>
                        <span>1 Page</span>
                        <span>•</span>
                        <span>{notebook.flashcard_count || 0} Cards</span>
                      </div>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {!notebooksLoading && (!notebooks || notebooks.length === 0) && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Book className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              No notebooks yet
            </h3>
            <p className="text-slate-600 mb-6">
              Create your first notebook in {selectedNotebook.name}
            </p>
            <button
              onClick={() => setShowNewNotebookModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Notebook
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-3">
          My Knowledge Atlas
        </h1>
        <p className="text-lg text-slate-600">
          Your collection of subjects and study materials
        </p>
      </div>

      <div className="mb-8">
        <button
          onClick={() => setShowNewSubjectModal(true)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          New Subject
        </button>
      </div>

      {subjectsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 p-8 animate-pulse"
            >
              <div className="w-16 h-16 bg-slate-200 rounded-2xl mb-4"></div>
              <div className="h-6 bg-slate-200 rounded w-2/3 mb-3"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects?.map((subject) => {
            const Icon = getIconComponent(subject.icon);
            return (
              <button
                key={subject.id}
                onClick={() => setSelectedNotebook(subject)}
                className="group text-left bg-white rounded-xl border-2 border-slate-200 p-8 hover:border-teal-300 hover:shadow-xl transition-all"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: `${subject.color}15` }}
                >
                  <Icon className="w-8 h-8" style={{ color: subject.color }} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-teal-700 transition-colors">
                  {subject.name}
                </h3>
                <p className="text-slate-600">
                  {subject.note_count || 0} {" "}
                  {subject.note_count === 1 ? "Notebook" : "Notebooks"}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {!subjectsLoading && (!subjects || subjects.length === 0) && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FolderOpen className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            No subjects yet
          </h3>
          <p className="text-slate-600 mb-6">
            Create your first subject to organize your study materials
          </p>
          <button
            onClick={() => setShowNewSubjectModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Subject
          </button>
        </div>
      )}

      {showNewSubjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Create New Subject
            </h2>
            <p className="text-slate-600 mb-6">Coming soon...</p>
            <button
              onClick={() => setShowNewSubjectModal(false)}
              className="w-full py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showNewNotebookModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Create New Notebook
            </h2>
            <p className="text-slate-600 mb-6">Coming soon...</p>
            <button
              onClick={() => setShowNewNotebookModal(false)}
              className="w-full py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
