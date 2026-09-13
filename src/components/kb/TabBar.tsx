import { Link } from "@tanstack/react-router";
import { Dumbbell, History, LineChart, Settings } from "lucide-react";

const tabs = [
  { to: "/", label: "Workout", Icon: Dumbbell },
  { to: "/history", label: "History", Icon: History },
  { to: "/progress", label: "Progress", Icon: LineChart },
  { to: "/settings", label: "Templates", Icon: Settings },
] as const;

export function TabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-lg">
        {tabs.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-semibold text-muted-foreground transition-colors"
            activeProps={{ className: "!text-primary" }}
          >
            <Icon className="size-6" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
