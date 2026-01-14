"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";

import { apiBaseUrl, apiFetch } from "../../../../utils/api";

export default function NotebookPage({ params }) {
  const { id } = params;
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeTab, setActiveTab] = useState("flashcards");
  const [viewMode, setViewMode] = useState("original");

  const { data: note, isLoading } = useQuery({
    queryKey: ["note", id],
    queryFn: async () => {
      const response = await apiFetch(`/api/notes/${id}`);
      return response.json();
    },
  });

  const handleNextPage = () => {
    if (note?.pages && currentPageIndex < note.pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  const handleNextCard = () => {
    if (note?.cards && currentCardIndex < note.cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsFlipped(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full">
        <div className="flex-1 bg-slate-50 p-8 animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-8"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
        <div className="w-[400px] bg-white border-l border-slate-200 p-6 animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/2 mb-4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  const pages = note?.file_url
    ? [
        {
          image_url: note.file_url.startsWith("http")
            ? note.file_url
            : `${apiBaseUrl}${note.file_url}`,
          digitized_text: note.summary || "",
        },
      ]
    : [];

  const currentPage = pages[currentPageIndex];
  const totalPages = pages.length;

  return (
    <div className="flex h-full">
      <div className="flex-1 bg-slate-50 flex flex-col">
        <div className="bg-white border-b border-slate-200 px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
            <a
              href="/dashboard/library"
              className="hover:text-slate-900 transition-colors"
            >
              Library
            </a>
            <span>/</span>
            <a
              href="/dashboard/library"
              className="hover:text-slate-900 transition-colors"
            >
              {note?.notebook?.name || "Subject"}
            </a>
            <span>/</span>
            <span className="text-slate-900 font-medium">
              {note?.title}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">{note?.title}</h1>

            <div className="flex items-center gap-3 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("original")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === "original"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Original Handwriting
              </button>
              <button
                onClick={() => setViewMode("digitized")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === "digitized"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Digitized Text
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            {viewMode === "original" ? (
              currentPage?.image_url ? (
                <div className="bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
                  <img
                    src={currentPage.image_url}
                    alt={`Page ${currentPageIndex + 1}`}
                    className="w-full"
                  />
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-20 text-center">
                  <p className="text-slate-500">
                    No image available for this page
                  </p>
                </div>
              )
            ) : (
              <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-12">
                <div
                  className="prose prose-slate max-w-none"
                  dangerouslySetInnerHTML={{
                    __html:
                      currentPage?.digitized_text
                        ?.replace(
                          /^# (.*$)/gim,
                          '<h1 class="text-3xl font-bold mb-4 mt-6 text-slate-900">$1</h1>',
                        )
                        .replace(
                          /^## (.*$)/gim,
                          '<h2 class="text-2xl font-bold mb-3 mt-5 text-slate-900">$1</h2>',
                        )
                        .replace(
                          /^### (.*$)/gim,
                          '<h3 class="text-xl font-semibold mb-2 mt-4 text-slate-900">$1</h3>',
                        )
                        .replace(
                          /^\- (.*$)/gim,
                          '<li class="ml-4 mb-2 text-slate-700">$1</li>',
                        )
                        .replace(
                          /\*\*(.*?)\*\*/g,
                          '<strong class="font-semibold text-slate-900">$1</strong>',
                        )
                        .replace(/\n\n/g, "<br/><br/>") ||
                      '<p class="text-slate-500">No digitized text available for this page</p>',
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border-t border-slate-200 px-8 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button
              onClick={handlePrevPage}
              disabled={currentPageIndex === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous Page
            </button>

            <span className="text-sm font-medium text-slate-700">
              Page {totalPages === 0 ? 0 : currentPageIndex + 1} of {totalPages}
            </span>

            <button
              onClick={handleNextPage}
              disabled={totalPages === 0 || currentPageIndex === totalPages - 1}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next Page
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="w-[400px] bg-white border-l border-slate-200 flex flex-col">
        <div className="border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab("flashcards")}
              className={`flex-1 py-4 px-6 text-sm font-semibold transition-all ${
                activeTab === "flashcards"
                  ? "text-teal-700 border-b-2 border-teal-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Flashcards
            </button>
            <button
              onClick={() => setActiveTab("summary")}
              className={`flex-1 py-4 px-6 text-sm font-semibold transition-all ${
                activeTab === "summary"
                  ? "text-teal-700 border-b-2 border-teal-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Summary
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "flashcards" && note?.cards && note.cards.length > 0 && (
            <div className="space-y-6">
              <div className="text-center text-sm font-medium text-slate-600">
                Card {currentCardIndex + 1} of {note.cards.length}
              </div>

              <div
                className="relative h-80 cursor-pointer"
                style={{ perspective: "1000px" }}
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <div
                  className="relative w-full h-full transition-transform duration-500"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}
                >
                  <div
                    className="absolute w-full h-full bg-white border-2 border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center shadow-xl"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <div className="text-center">
                      <div className="text-xs font-bold tracking-wider text-slate-500 mb-4">
                        QUESTION
                      </div>
                      <p className="text-lg font-semibold text-slate-900 leading-relaxed">
                        {note.cards[currentCardIndex]?.question}
                      </p>
                    </div>
                  </div>

                  <div
                    className="absolute w-full h-full bg-gradient-to-br from-teal-50 to-white border-2 border-teal-300 rounded-2xl p-6 flex flex-col justify-between shadow-xl"
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                  >
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <div className="text-xs font-bold tracking-wider text-teal-700 mb-4">
                        ANSWER
                      </div>
                      <p className="text-base text-slate-900 leading-relaxed text-center">
                        {note.cards[currentCardIndex]?.answer}
                      </p>
                    </div>

                    <div className="flex gap-2 mt-6">
                      <button className="flex-1 py-2 px-3 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors border border-slate-300">
                        Needs Practice
                      </button>
                      <button className="flex-1 py-2 px-3 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition-colors shadow-lg">
                        Got it
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={handlePrevCard}
                  disabled={currentCardIndex === 0}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3 h-3" />
                  Previous
                </button>
                <button
                  onClick={handleNextCard}
                  disabled={currentCardIndex === note.cards.length - 1}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <p className="text-xs text-center text-slate-500">
                Click card to flip
              </p>
            </div>
          )}

          {activeTab === "summary" && (
            <div className="prose prose-slate max-w-none">
              <div
                className="text-slate-700 leading-relaxed text-sm"
                dangerouslySetInnerHTML={{
                  __html: note?.summary
                    ?.replace(
                      /^# (.*$)/gim,
                      '<h1 class="text-xl font-bold mb-3 mt-4 text-slate-900">$1</h1>',
                    )
                    .replace(
                      /^## (.*$)/gim,
                      '<h2 class="text-lg font-bold mb-2 mt-3 text-slate-900">$2</h2>',
                    )
                    .replace(
                      /^### (.*$)/gim,
                      '<h3 class="text-base font-semibold mb-2 mt-3 text-slate-900">$1</h3>',
                    )
                    .replace(
                      /^\- (.*$)/gim,
                      '<li class="ml-4 mb-1 text-slate-700 text-sm">$1</li>',
                    )
                    .replace(
                      /\*\*(.*?)\*\*/g,
                      '<strong class="font-semibold text-slate-900">$1</strong>',
                    )
                    .replace(/\n\n/g, "<br/><br/>") ||
                  '<p class="text-slate-500">No summary available yet.</p>',
                }}
              />
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
      `}</style>
    </div>
  );
}
