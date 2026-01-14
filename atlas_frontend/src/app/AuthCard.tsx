import { Link } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";
import { useState } from "react";

type AuthCardProps = {
  title: string;
  subtitle: string;
  buttonLabel: string;
  footerText: string;
  footerLink: string;
  onSubmit: (email: string, password: string) => Promise<void>;
};

const AuthCard = ({
  title,
  subtitle,
  buttonLabel,
  footerText,
  footerLink,
  onSubmit,
}: AuthCardProps) => {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl bg-surface p-10 shadow-card">
        <div className="mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-text text-white">
            A
          </div>
        </div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted">{subtitle}</p>
        <form
          className="mt-6 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setIsSubmitting(true);
            const form = event.currentTarget as HTMLFormElement;
            const formData = new FormData(form);
            const email = String(formData.get("email") || "");
            const password = String(formData.get("password") || "");
            try {
              await onSubmit(email, password);
            } catch (submitError) {
              setError("Unable to authenticate. Please check your details.");
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted" htmlFor="email">
              Email
            </label>
            <input
              className="w-full rounded-2xl border border-border bg-base px-4 py-3 text-sm outline-none focus:border-primary"
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted" htmlFor="password">
              Password
            </label>
            <input
              className="w-full rounded-2xl border border-border bg-base px-4 py-3 text-sm outline-none focus:border-primary"
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
            />
          </div>
          <PrimaryButton className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Working..." : buttonLabel}
          </PrimaryButton>
        </form>
        {error ? <p className="mt-4 text-xs text-red-500">{error}</p> : null}
        <p className="mt-6 text-center text-xs text-muted">
          {footerText} {" "}
          <Link className="text-primary" to={footerLink}>
            {footerLink === "/login" ? "Sign in" : "Sign up"}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AuthCard;
