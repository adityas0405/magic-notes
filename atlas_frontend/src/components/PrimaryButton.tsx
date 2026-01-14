import React from "react";

type PrimaryButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

const PrimaryButton = ({ children, className = "", ...props }: PrimaryButtonProps) => {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-text px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-slate-900 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default PrimaryButton;
