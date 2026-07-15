"use client";

import { useEffect, useState } from "react";

const navItems = [
  { label: "Inicio", href: "#inicio" },
  { label: "Lugar y horario", href: "#lugar" },
  { label: "Código de vestimenta", href: "#vestimenta" },
  { label: "Té de cocina", href: "#regalos" },
] as const;

export function Navigation() {
  const [activeSection, setActiveSection] = useState("inicio");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);

      const sections = navItems.map((item) => item.href.slice(1));
      const scrollPosition = window.scrollY + 120;

      for (let i = sections.length - 1; i >= 0; i--) {
        const element = document.getElementById(sections[i]);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "border-b border-beige-200/80 bg-white/95 shadow-sm backdrop-blur-md"
          : "bg-white/80 backdrop-blur-sm"
      }`}
    >
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
        <a
          href="#inicio"
          onClick={(e) => handleClick(e, "#inicio")}
          className="font-serif text-sm tracking-wide text-sage-800 sm:text-base"
        >
          K & C
        </a>

        <ul className="flex gap-1 overflow-x-auto scrollbar-none sm:gap-2">
          {navItems.map((item) => {
            const sectionId = item.href.slice(1);
            const isActive = activeSection === sectionId;

            return (
              <li key={item.href} className="shrink-0">
                <a
                  href={item.href}
                  onClick={(e) => handleClick(e, item.href)}
                  className={`block rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:px-4 sm:text-sm ${
                    isActive
                      ? "bg-sage-100 text-sage-800"
                      : "text-gray-500 hover:bg-beige-100 hover:text-sage-700"
                  }`}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
