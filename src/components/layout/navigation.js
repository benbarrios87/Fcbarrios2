const links = [
  { href: "/", icon: "⌂", label: "Hjem" },
  { href: "/tips", icon: "⚽", label: "Tips" },
  { href: "/leaderboard", icon: "🏆", label: "Tabell" },
  { href: "/stats", icon: "▥", label: "Stats" },
  { href: "/profile", icon: "◉", label: "Profil" }
];

export function Navigation() {
  return `
    <nav class="bottom-nav" aria-label="Hovedmeny">
      ${links
        .map(
          (link) => `
            <a href="${link.href}" data-link data-nav-path="${link.href}">
              <span>${link.icon}</span>
              <small>${link.label}</small>
            </a>
          `
        )
        .join("")}
    </nav>
  `;
}

export function setActiveNavigation(path) {
  document.querySelectorAll("[data-nav-path]").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.navPath === path);
  });
}
