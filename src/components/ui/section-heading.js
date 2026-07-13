export function SectionHeading({ eyebrow = "", title, action = "" }) {
  return `
    <div class="section-heading">
      <div>
        ${eyebrow ? `<span>${eyebrow}</span>` : ""}
        <h2>${title}</h2>
      </div>
      ${action}
    </div>
  `;
}
