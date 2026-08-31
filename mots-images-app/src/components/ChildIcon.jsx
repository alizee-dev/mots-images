export default function ChildIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 4.2c1.6 0 2.7 1 2.9 2.3" />
      <circle cx="9.3" cy="11.2" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="14.7" cy="11.2" r="0.7" fill="currentColor" stroke="none" />
      <path d="M9.3 14.4c.8.9 3.6.9 4.4 0" />
    </svg>
  )
}
