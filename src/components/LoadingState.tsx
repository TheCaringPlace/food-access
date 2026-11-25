import { LoaderCircle } from "lucide-react";

type LoadingStateProps = {
  className?: string;
};

export function LoadingState({ className = "" }: LoadingStateProps) {
  return (
    <output aria-live="polite" className={`grid place-items-center ${className}`}>
      <LoaderCircle aria-hidden="true" className="size-8 animate-spin text-slate-700" />
      <span className="sr-only">Loading</span>
    </output>
  );
}
