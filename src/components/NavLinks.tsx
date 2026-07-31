"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <>
      {items.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          className="nav-link text-sm"
          data-active={pathname === n.href || pathname.startsWith(`${n.href}/`)}
        >
          {n.label}
        </Link>
      ))}
    </>
  );
}
