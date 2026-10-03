// One small stroked icon set (20px grid, 1.75 stroke, round caps) in place
// of Unicode glyphs, so every control's symbol shares a weight and sits on
// the text baseline the same way. Always decorative: the control carries
// the accessible name.
const PATHS = {
  close: <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />,
  chevronDown: <path d="M5.5 8l4.5 4.5L14.5 8" />,
  chevronUp: <path d="M5.5 12.5L10 8l4.5 4.5" />,
  sortAsc: <path d="M10 15V5.5M6 9.5l4-4 4 4" />,
  sortDesc: <path d="M10 5v9.5M6 10.5l4 4 4-4" />,
  external: (
    <>
      <path d="M8.5 4.5h-4v11h11v-4" />
      <path d="M11.5 4.5h4v4M15.5 4.5L9 11" />
    </>
  ),
  link: (
    <>
      <path d="M8.6 11.4a3 3 0 0 0 4.24 0l2.47-2.47a3 3 0 0 0-4.24-4.24l-1.06 1.06" />
      <path d="M11.4 8.6a3 3 0 0 0-4.24 0l-2.47 2.47a3 3 0 0 0 4.24 4.24l1.06-1.06" />
    </>
  ),
  check: <path d="M5 10.5l3.25 3.25L15 7" />,
};

export default function Icon({ name, size = 16 }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
