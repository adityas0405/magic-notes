import { Link } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";

const features = [
  {
    title: "Instant Summarization",
    description:
      "Upload your handwritten notes and watch as AI extracts key concepts, organizing them into clear, structured summaries.",
  },
  {
    title: "Active Recall Flashcards",
    description:
      "Automatically generate flashcards designed for spaced repetition. Test yourself and track what you’ve mastered.",
  },
  {
    title: "Knowledge Library",
    description:
      "Build your personal knowledge base. All your study materials organized, searchable, and accessible whenever you need them.",
  },
];

const HomePage = () => {
  return (
    <div className="min-h-screen bg-base text-text">
      <header className="flex items-center justify-between px-12 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-text text-white">
            A
          </div>
          <span className="text-lg font-semibold">Atlas</span>
        </div>
        <Link className="text-sm font-medium text-muted" to="/login">
          Sign In
        </Link>
      </header>

      <main className="atlas-hero-bg">
        <section className="mx-auto max-w-4xl px-6 pb-20 pt-12 text-center">
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            Chart Your Knowledge. <span className="text-primary">Turn Notes into Mastery.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted md:text-base">
            Transform your handwritten notes into structured summaries, active recall flashcards, and
            comprehensive quizzes. Your personal AI study companion for true understanding.
          </p>
          <div className="mt-8 flex justify-center">
            <PrimaryButton>
              Start Mapping <span aria-hidden>→</span>
            </PrimaryButton>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-20">
          <div className="grid gap-10 text-center md:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-primary">
                  ✦
                </div>
                <h3 className="text-base font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-12 py-6 text-xs text-muted">
        © 2026 Atlas. Intellectual cartography for students.
      </footer>
    </div>
  );
};

export default HomePage;
