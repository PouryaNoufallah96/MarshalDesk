import type { ComponentProps } from "react";

export function LogoMark(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M7 3h10a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-5.5l-4.3 3.4A.75.75 0 0 1 6 19.8V17a4 4 0 0 1-3-3.87V7a4 4 0 0 1 4-4Z"
        fill="currentColor"
      />
      <circle cx="8.5" cy="10" r="1.25" fill="#fff" />
      <circle cx="12" cy="10" r="1.25" fill="#fff" />
      <circle cx="15.5" cy="10" r="1.25" fill="#fff" />
    </svg>
  );
}
