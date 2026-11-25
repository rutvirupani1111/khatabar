import "../site.css";

// The marketing pages load the street's stylesheet; the app screens never do.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
