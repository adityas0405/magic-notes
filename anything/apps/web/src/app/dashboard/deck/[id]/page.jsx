"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, BookOpen, FileText } from "lucide-react";

import { apiBaseUrl, apiFetch } from "../../../../utils/api";

export default function DeckPage({ params }) {
  const { id } = params;
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeTab, setActiveTab] = useState("flashcards");

  const { data: note, isLoading } = useQuery({
    queryKey: ["note", id],
    queryFn: async () => {
      const response = await apiFetch(`/api/notes/${id}`);
      return response.json();
    },
  });

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
        <div className="w-[30%] border-r border-slate-200 bg-white p-6 animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-3/4 mb-4"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
        <div className="w-[35%] border-r border-slate-200 bg-white p-6 animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded"></div>
            <div className="h-4 bg-slate-200 rounded"></div>
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
          </div>
        </div>
        <div className="w-[35%] bg-white p-6 animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/2 mb-4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  const imageUrl = note?.file_url
    ? note.file_url.startsWith("http")
      ? note.file_url
      : `${apiBaseUrl}${note.file_url}`
    : "";

  return (
    <div className="flex h-full">
      <div className="w-[30%] border-r border-slate-200 bg-white flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <a
            href="/dashboard/library"
            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Library
          </a>
          <input
            type="text"
            defaultValue={note?.title}
            className="text-2xl font-bold text-slate-900 w-full border-none outline-none focus:ring-0 p-0 bg-transparent"
            placeholder="Untitled Topic"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <FileText className="w-4 h-4" />
              Source Material
            </div>
          </div>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={note?.title}
              className="w-full rounded-lg border border-slate-200 shadow-sm"
            />
          ) : (
            <div className="w-full h-96 bg-slate-100 rounded-lg flex items-center justify-center">
              <p className="text-slate-500">No source image available</p>
            </div>
          )}
        </div>
      </div>

      <div className="w-[35%] border-r border-slate-200 bg-white flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-2 text-slate-900">
            <BookOpen className="w-5 h-5" />
            <h2 className="text-xl font-semibold">AI Summary</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-slate max-w-none">
            <div
              className="text-slate-700 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: note?.summary
                  ?.replace(
                    /^# (.*$)/gim,
                    '<h1 class="text-2xl font-bold mb-4 mt-6 text-slate-900">$1</h1>',
                  )
                  .replace(
                    /^## (.*$)/gim,
                    '<h2 class="text-xl font-bold mb-3 mt-5 text-slate-900">$1</h2>',
                  )
                  .replace(
                    /^### (.*$)/gim,
                    '<h3 class="text-lg font-semibold mb-2 mt-4 text-slate-900">$1</h3>',
                  )
                  .replace(
                    /^\- (.*$)/gim,
                    '<li class="ml-4 mb-2 text-slate-700">$1</li>',
                  )
                  .replace(
                    /^\d+\. (.*$)/gim,
                    '<li class="ml-4 mb-2 text-slate-700">$1</li>',
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
        </div>
      </div>

      <div className="w-[35%] bg-white flex flex-col">
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
              onClick={() => setActiveTab("quiz")}
              className={`flex-1 py-4 px-6 text-sm font-semibold transition-all ${
                activeTab === "quiz"
                  ? "text-teal-700 border-b-2 border-teal-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Quiz
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
                    className="absolute w-full h-full bg-white border-2 border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center shadow-xl"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <div className="text-center">
                      <div className="text-xs font-bold tracking-wider text-slate-500 mb-4">
                        QUESTION
                      </div>
                      <p className="text-xl font-semibold text-slate-900 leading-relaxed">
                        {note.cards[currentCardIndex]?.question}
                      </p>
                    </div>
                  </div>

                  <div
                    className="absolute w-full h-full bg-gradient-to-br from-teal-50 to-white border-2 border-teal-300 rounded-2xl p-8 flex flex-col justify-between shadow-xl"
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                  >
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <div className="text-xs font-bold tracking-wider text-teal-700 mb-4">
                        ANSWER
                      </div>
                      <p className="text-lg text-slate-900 leading-relaxed text-center">
                        {note.cards[currentCardIndex]?.answer}
                      </p>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors border border-slate-300">
                        Needs Practice
                      </button>
                      <button className="flex-1 py-3 px-4 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors shadow-lg">
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
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  onClick={handleNextCard}
                  disabled={currentCardIndex === note.cards.length - 1}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-center text-slate-500 mt-4">
                Click card to flip
              </p>
            </div>
          )}

          {activeTab === "quiz" && (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Quiz Mode Coming Soon
              </h3>
              <p className="text-slate-600">
                We're building an interactive quiz feature for comprehensive
                testing
              </p>
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
