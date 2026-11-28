// Unlike layout.tsx, template.tsx re-mounts on every navigation, which is what
// lets the CSS entrance animation replay on each page change.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>
}
