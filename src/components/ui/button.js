export function Button({
  label,
  href = "#",
  variant = "primary",
  icon = "",
  dataLink = true
}) {
  return `
    <a
      class="button button--${variant}"
      href="${href}"
      ${dataLink ? "data-link" : ""}
    >
      ${icon ? `<span>${icon}</span>` : ""}
      ${label}
    </a>
  `;
}
