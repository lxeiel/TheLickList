"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { List, X } from "@phosphor-icons/react";
import { listHref, mapHref } from "@/lib/filters";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import styles from "./SiteNav.module.css";

type Page = "map" | "list" | "about";

function currentPage(pathname: string): Page | null {
  if (pathname === "/") return "map";
  if (pathname.startsWith("/list")) return "list";
  if (pathname.startsWith("/about")) return "about";
  return null;
}

function NavBar({ hrefs }: { hrefs: Record<Page, string> }) {
  const pathname = usePathname();
  const current = currentPage(pathname);
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const menuId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  // Navigating away closes the menu.
  if (open && pathname !== openedAt) setOpen(false);

  // On the homepage the bar stays out of the way while the logo hero fills the
  // screen, and slides in once the hero has scrolled up past it.
  const isHome = pathname === "/";
  const [overHero, setOverHero] = useState(isHome);
  useEffect(() => {
    if (!isHome) return;
    const navHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 64;
    const visibility = new IntersectionObserver(([entry]) => setOverHero(entry.isIntersecting), {
      rootMargin: `-${navHeight}px 0px 0px 0px`,
    });
    // The nav hydrates before the page's streamed content arrives, so the
    // hero may not exist yet: wait for it to appear, then watch it.
    const watch = () => {
      const hero = document.getElementById("hero");
      if (!hero) return false;
      visibility.observe(hero);
      return true;
    };
    const arrival = new MutationObserver(() => {
      if (watch()) arrival.disconnect();
    });
    if (!watch()) arrival.observe(document.body, { childList: true, subtree: true });
    return () => {
      arrival.disconnect();
      visibility.disconnect();
    };
  }, [isHome]);
  const hidden = isHome && overHero;
  if (hidden && open) setOpen(false);

  useEffect(() => {
    if (!open) return;
    firstLink.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const links: { page: Page; label: string }[] = [
    { page: "map", label: "Map" },
    { page: "list", label: "List" },
    { page: "about", label: "About" },
  ];

  return (
    <header className={styles.bar} data-home={isHome || undefined} data-hidden={hidden || undefined} inert={hidden}>
      <Link href="/" className={styles.logo}>
        <Logo size="nav" />
      </Link>

      <div className={styles.actions}>
        <nav aria-label="Main" className={styles.links}>
          {links.map(({ page, label }) => (
            <Link
              key={page}
              href={hrefs[page]}
              className={styles.link}
              aria-current={current === page ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
        <button
          ref={menuButton}
          type="button"
          className={styles.menuButton}
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => {
            setOpenedAt(pathname);
            setOpen(!open);
          }}
        >
          {open ? <X size={20} aria-hidden /> : <List size={20} aria-hidden />}
        </button>
      </div>

      {open && (
        <nav id={menuId} aria-label="Main" className={styles.menu}>
          {links.map(({ page, label }, i) => (
            <Link
              key={page}
              ref={i === 0 ? firstLink : undefined}
              href={hrefs[page]}
              className={styles.menuLink}
              aria-current={current === page ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {label}
              {current === page && <span className={styles.currentDot} aria-hidden />}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

// Links carry the current filters across pages, which needs the query
// string; useSearchParams requires a Suspense boundary (see layout.tsx).
export default function SiteNav() {
  const params = useSearchParams();
  return <NavBar hrefs={{ map: `${mapHref(params)}#map`, list: listHref(params), about: "/about" }} />;
}

// Same bar with plain links, shown until the query string is available.
export function SiteNavFallback() {
  return <NavBar hrefs={{ map: "/#map", list: "/list", about: "/about" }} />;
}
