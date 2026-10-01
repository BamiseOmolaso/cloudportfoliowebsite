import { testimonialsSection, visibleTestimonials } from "@/content/portfolio";

/**
 * Quotes from past clients. Placeholder quotes are shown in development so
 * the layout can be reviewed, and never in a production build: until a real
 * testimonial is added, this section renders nothing there.
 */
export default function Testimonials() {
  const items = visibleTestimonials(process.env.NODE_ENV === "production");
  if (items.length === 0) return null;

  return (
    <section className="block" id="kind-words">
      <div className="sec-head rise">
        <span className="label">{testimonialsSection.label}</span>
        <h2>{testimonialsSection.title}</h2>
      </div>
      <div className="quotes">
        {items.map((t, i) => (
          <figure className="quote rise" key={`${t.name}-${i}`}>
            {t.placeholder && (
              <span className="ph">Placeholder · not shown in production</span>
            )}
            <blockquote>{t.quote}</blockquote>
            <figcaption>
              <b>{t.name}</b>
              <span>{t.role}</span>
              {t.project && <span className="proj-tag">{t.project}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
