import Image from "next/image";
import { youtube } from "@/content/portfolio";

/** The channel, with its featured videos. Thumbnails link out to YouTube. */
export default function YouTube() {
  return (
    <section className="block" id="youtube">
      <div className="sec-head rise">
        <span className="label">{youtube.label}</span>
        <h2>{youtube.title}</h2>
        <p>{youtube.body}</p>
      </div>
      <div className="videos">
        {youtube.videos.map((v) => (
          <a
            className="video rise"
            key={v.id}
            href={`https://www.youtube.com/watch?v=${v.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="thumb">
              <Image
                src={`https://img.youtube.com/vi/${v.id}/hqdefault.jpg`}
                alt=""
                fill
                sizes="(min-width: 58rem) 33vw, 100vw"
                unoptimized
              />
              <i className="play" aria-hidden="true">
                ▶
              </i>
            </span>
            <span className="vt">{v.title}</span>
          </a>
        ))}
      </div>
      <div className="ctas">
        <a
          className="btn primary"
          href={youtube.channel}
          target="_blank"
          rel="noopener noreferrer"
        >
          {youtube.subscribe}
        </a>
        <a
          className="btn"
          href={youtube.channel}
          target="_blank"
          rel="noopener noreferrer"
        >
          {youtube.all}
        </a>
      </div>
    </section>
  );
}
