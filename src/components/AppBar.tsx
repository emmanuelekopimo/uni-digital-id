import Link from "next/link";
import { History, IdCard, LayoutGrid, LogOut, ScanLine } from "lucide-react";
import type { User } from "@/db/schema";
import { logout } from "@/app/actions/auth";
import { avatarUri } from "@/lib/avatar";

type Tab = "checkpoint" | "classes" | "log" | "card";

export function AppBar({ user, active }: { user: User; active: Tab }) {
  const tabs =
    user.role === "lecturer"
      ? [
          { key: "checkpoint", href: "/scan", label: "Checkpoint", Icon: ScanLine },
          { key: "classes", href: "/courses", label: "Classes", Icon: LayoutGrid },
          { key: "log", href: "/log", label: "Scan log", Icon: History },
        ]
      : [{ key: "card", href: "/card", label: "My ID", Icon: IdCard }];
  return (
    <header className="bar no-print">
      <div className="wrap bar-inner">
        <Link href="/" className="brand">
          <img src="/logo.svg" alt="" />
          <span>UniUyo ID<small>{user.role === "lecturer" ? "Lecturer checkpoint" : "Student identity"}</small></span>
        </Link>
        <nav className="tabs" aria-label="Main">
          {tabs.map(({ key, href, label, Icon }) => (
            <Link key={key} href={href} aria-current={active === key ? "page" : undefined} data-testid={`tab-${key}`}>
              <Icon size={17} /> <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="who">
          <img src={avatarUri(user.email)} alt="" />
          <div className="who-text"><b>{user.name}</b><span>{user.role === "lecturer" ? user.department : "Student"}</span></div>
          <form action={logout}><button aria-label="Sign out" title="Sign out" data-testid="logout"><LogOut size={16} /></button></form>
        </div>
      </div>
    </header>
  );
}
