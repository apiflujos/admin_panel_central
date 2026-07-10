"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    try {
      const csrfRes = await fetch("/api/auth/csrf", { credentials: "include" });
      if (csrfRes.ok) {
        const csrfData = (await csrfRes.json()) as { token?: string };
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfData.token || "",
          },
          credentials: "include",
        });
      }
    } catch {
      // Ignore errors and redirect to login anyway.
    }
    router.replace("/auth/login");
    router.refresh();
  }

  return (
    <button className="sidebarExit" type="button" onClick={handleLogout}>
      <span className="nav-icon" aria-hidden="true">
        <LogOut size={16} strokeWidth={1.75} />
      </span>
      <span className="nav-label">Salir</span>
    </button>
  );
}
