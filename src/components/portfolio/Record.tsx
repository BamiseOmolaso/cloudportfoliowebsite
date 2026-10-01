import {
  certifications,
  clinical,
  experience,
  record,
  skills,
  writing,
} from "@/content/portfolio";

/** Experience, certifications and skills. */
export function Record() {
  return (
    <section className="block" id="record">
      <div className="sec-head rise">
        <span className="label">{record.label}</span>
        <h2>{record.title}</h2>
      </div>
      <div className="cols rise">
        <div>
          <p className="sub">{record.experienceHeading}</p>
          <div className="tl">
            {experience.map((e) => (
              <div className="tl-i" key={e.title}>
                <span className="when">{e.when}</span>
                <div>
                  <h3>{e.title}</h3>
                  <p className="org">{e.org}</p>
                  <p className="d">{e.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="sub">{record.certificationsHeading}</p>
          <div>
            {certifications.map((c) => (
              <div className="item" key={c.name}>
                <span>{c.name}</span>
                <span className="yr">{c.year}</span>
              </div>
            ))}
          </div>
          <div className="chips">
            {skills.map((s) => (
              <span className="chip" key={s}>
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Clinical habits that carry into operations. */
export function Clinical() {
  return (
    <section className="block" id="clinical">
      <div className="sec-head rise">
        <span className="label">{clinical.label}</span>
        <h2>{clinical.title}</h2>
      </div>
      <div className="map rise">
        {clinical.rows.map((r) => (
          <div className="map-r" key={r.from}>
            <span className="a">{r.from}</span>
            <span className="ar" aria-hidden="true">
              →
            </span>
            <span className="b">{r.to}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Write-ups, talks and the architecture guide. */
export function Writing() {
  return (
    <section className="block" id="writing">
      <div className="sec-head rise">
        <span className="label">{writing.label}</span>
        <h2>{writing.title}</h2>
      </div>
      <div className="writing rise">
        {writing.cards.map((c) => (
          <a
            className="wcard"
            key={c.title}
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="label">{c.kind}</span>
            <h3>{c.title}</h3>
            <p>{c.body}</p>
            <span className="go">{c.cta}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
