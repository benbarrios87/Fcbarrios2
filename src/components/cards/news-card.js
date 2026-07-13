import { SectionHeading } from "../ui/section-heading.js";

export function NewsCard(news) {
  return `
    <section class="panel panel--news">
      ${SectionHeading({ eyebrow: "Automatisk", title: "Siste nytt" })}
      <div class="news-list">
        ${news
          .map(
            (item) => `
              <article class="news-item news-item--${item.type}">
                <span class="news-item__icon">${item.icon}</span>
                <div>
                  <small>${item.tag}</small>
                  <h3>${item.title}</h3>
                  <p>${item.body}</p>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}
