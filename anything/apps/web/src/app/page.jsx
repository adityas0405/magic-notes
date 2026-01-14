"use client";

import { BookOpen, Zap, Library, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-bold text-slate-900">Atlas</span>
          </div>
          <a
            href="/login"
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
          >
            Sign In
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Topographic background pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="topographic"
                x="0"
                y="0"
                width="100"
                height="100"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M20 50 Q 30 40, 40 50 T 60 50 T 80 50"
                  stroke="#0D9488"
                  fill="none"
                  strokeWidth="1"
                />
                <path
                  d="M20 60 Q 30 50, 40 60 T 60 60 T 80 60"
                  stroke="#0D9488"
                  fill="none"
                  strokeWidth="1"
                />
                <path
                  d="M20 70 Q 30 60, 40 70 T 60 70 T 80 70"
                  stroke="#0D9488"
                  fill="none"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#topographic)" />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              Chart Your Knowledge.
              <br />
              <span className="text-teal-600">Turn Notes into Mastery.</span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 leading-relaxed">
              Transform your handwritten notes into structured summaries, active
              recall flashcards, and comprehensive quizzes. Your personal AI
              study companion for true understanding.
            </p>
            <a
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-lg font-semibold text-lg hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl"
            >
              Start Mapping
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12">
            {/* Feature 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Instant Summarization
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Upload your handwritten notes and watch as AI extracts key
                concepts, organizing them into clear, structured summaries.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Active Recall Flashcards
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Automatically generate flashcards designed for spaced
                repetition. Test yourself and track what you've mastered.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Library className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Knowledge Library
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Build your personal knowledge base. All your study materials
                organized, searchable, and accessible whenever you need them.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-900 rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="font-semibold text-slate-900">Atlas</span>
            </div>
            <p className="text-sm text-slate-600">
              © 2026 Atlas. Intellectual cartography for students.
            </p>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
      `}</style>
    </div>
  );
}
