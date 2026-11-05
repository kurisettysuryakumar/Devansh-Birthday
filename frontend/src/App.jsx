import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { eventConfig, featuredBirthdayPhotos } from "./config/eventConfig.js";
import GalleryPreview from "./components/GalleryPreview.jsx";

function ElephantFigure({ variant = "left" }) {
  const uid = useId().replace(/:/g, "");
  const bodyGrad = `elephantBodyGrad-${uid}`;
  const earGrad = `elephantEarGrad-${uid}`;
  const blanketGrad = `elephantBlanketGrad-${uid}`;

  return (
    <svg viewBox="0 0 180 180" className={`elephant-illustration elephant-illustration--${variant}`} aria-hidden="true">
      <defs>
        <linearGradient id={bodyGrad} x1="0" x2="1">
          <stop offset="0%" stopColor="#c3e9f5" />
          <stop offset="48%" stopColor="#83c3d8" />
          <stop offset="100%" stopColor="#4d91ae" />
        </linearGradient>
        <linearGradient id={earGrad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe9d7" />
          <stop offset="100%" stopColor="#e6a9a0" />
        </linearGradient>
        <linearGradient id={blanketGrad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#247e80" />
          <stop offset="100%" stopColor="#12565f" />
        </linearGradient>
      </defs>

      <ellipse cx="90" cy="162" rx="62" ry="11" fill="rgba(35, 43, 48, 0.19)" />

      <path d="M42 127c0-24 20-43 48-43h4c30 0 48 18 48 43v27H42v-27Z" fill={`url(#${bodyGrad})`} stroke="#285d78" strokeWidth="3.5" />
      <path d="M45 136c-8 1-12 8-12 18v9h31v-23c-5-4-11-6-19-4Z" fill="#6baac1" stroke="#285d78" strokeWidth="3.5" />
      <path d="M116 139c-2 8-2 15 0 24h31v-9c0-11-5-18-14-19-7-1-13 1-17 4Z" fill="#609eb8" stroke="#285d78" strokeWidth="3.5" />
      <path d="M56 140v20M72 143v17M108 143v17M124 140v20" stroke="#285d78" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 161h35M113 161h36" stroke="#1f5874" strokeWidth="5" strokeLinecap="round" />

      <ellipse cx="47" cy="82" rx="30" ry="39" fill={`url(#${earGrad})`} stroke="#285d78" strokeWidth="4" />
      <ellipse cx="47" cy="82" rx="19" ry="27" fill="#f3c8bc" stroke="#d18e83" strokeWidth="2" />
      <ellipse cx="133" cy="82" rx="30" ry="39" fill={`url(#${earGrad})`} stroke="#285d78" strokeWidth="4" />
      <ellipse cx="133" cy="82" rx="19" ry="27" fill="#f3c8bc" stroke="#d18e83" strokeWidth="2" />

      <ellipse cx="90" cy="83" rx="45" ry="48" fill={`url(#${bodyGrad})`} stroke="#285d78" strokeWidth="4" />
      <path d="M53 71c7-22 25-34 43-34 19 0 36 13 42 35-16-8-27-11-42-11-14 0-28 3-43 10Z" fill="#d5f0ef" opacity="0.72" />

      <path d="M68 78c5-9 18-10 24-1" stroke="#285d78" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M88 77c7-9 20-8 25 1" stroke="#285d78" strokeWidth="3" strokeLinecap="round" fill="none" />
      <ellipse cx="78" cy="88" rx="8" ry="10" fill="#fffdf3" stroke="#285d78" strokeWidth="2.5" />
      <ellipse cx="104" cy="88" rx="8" ry="10" fill="#fffdf3" stroke="#285d78" strokeWidth="2.5" />
      <circle cx="80" cy="89" r="3.5" fill="#263845" />
      <circle cx="102" cy="89" r="3.5" fill="#263845" />
      <circle cx="79" cy="87" r="1.4" fill="#fff" />
      <circle cx="101" cy="87" r="1.4" fill="#fff" />
      <ellipse cx="62" cy="104" rx="7" ry="4" fill="#df948c" opacity="0.52" />
      <ellipse cx="118" cy="104" rx="7" ry="4" fill="#df948c" opacity="0.52" />

      <path d="M83 98c-7 9-10 19-9 30 1 11 7 17 15 17 9 0 15-7 15-16 0-7-5-12-10-16-4-3-4-7-1-12l7-10-17 7Z" fill="#a9dbe3" stroke="#285d78" strokeWidth="4" strokeLinejoin="round" />
      <path d="M80 128c5 5 13 7 20 4" stroke="#6caebe" strokeWidth="3" strokeLinecap="round" fill="none" />
      <ellipse cx="87" cy="139" rx="2" ry="1.4" fill="#285d78" />
      <path d="M64 111c4-5 9-7 14-8M115 111c-4-5-8-7-12-8" stroke="#285d78" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M59 125c8 7 18 11 31 11 13 0 24-4 32-11v15c-7 7-18 10-32 10-13 0-24-3-31-10v-15Z" fill={`url(#${blanketGrad})`} stroke="#e9bd62" strokeWidth="3" />
      <path d="M65 132h50" stroke="#f2d27f" strokeWidth="2" strokeDasharray="4 4" />
      <circle cx="90" cy="140" r="5" fill="#f4d47d" stroke="#9d6a2d" strokeWidth="1.5" />
      <path d="M80 53c2-10 8-15 14-15s12 5 14 15" fill="#a52327" stroke="#7c1a20" strokeWidth="3" />
      <path d="M79 54h30" stroke="#f1ce72" strokeWidth="4" strokeLinecap="round" />
      <circle cx="94" cy="35" r="5" fill="#f3cf73" stroke="#a87832" strokeWidth="2" />
      <path d="M49 120c-8 2-13 7-17 15" stroke="#285d78" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="31" cy="136" r="3" fill="#d8ad5e" />
    </svg>
  );
}

function WelcomeDecorations() {
  return (
    <div className="welcome-decorations" aria-hidden="true">
      <div className="welcome-bunting">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="welcome-animal welcome-animal--lion">
        <svg viewBox="0 0 120 140">
          <ellipse cx="60" cy="132" rx="43" ry="7" fill="rgba(39,37,42,.18)" />
          <path d="M19 46c-8-19 9-35 24-34 5-12 24-12 32-3 16-8 33 1 31 20 15 12 12 31 1 39 9 18-2 34-16 35-7 16-29 19-39 7-17 9-35 0-34-17-13-12-10-34 1-47Z" fill="#c87532" stroke="#713d29" strokeWidth="4" />
          <ellipse cx="60" cy="67" rx="34" ry="37" fill="#f2bf6c" stroke="#713d29" strokeWidth="3" />
          <ellipse cx="27" cy="52" rx="11" ry="13" fill="#f6d58f" stroke="#713d29" strokeWidth="3" />
          <ellipse cx="93" cy="52" rx="11" ry="13" fill="#f6d58f" stroke="#713d29" strokeWidth="3" />
          <ellipse cx="45" cy="61" rx="5" ry="7" fill="#fff8df" />
          <ellipse cx="75" cy="61" rx="5" ry="7" fill="#fff8df" />
          <circle cx="46" cy="62" r="2.8" fill="#382b2a" />
          <circle cx="74" cy="62" r="2.8" fill="#382b2a" />
          <ellipse cx="60" cy="79" rx="21" ry="16" fill="#fff0d0" stroke="#b87942" strokeWidth="2" />
          <path d="M55 75q5-6 10 0l-5 5Z" fill="#633b37" />
          <path d="M60 80q-10 11-18 2m18-2q10 11 18 2" fill="none" stroke="#633b37" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M32 105c10-8 18-10 28-10s20 4 28 12l10 24H22l10-26Z" fill="#238080" stroke="#713d29" strokeWidth="3" />
          <path d="M36 108h48" stroke="#f3d17d" strokeWidth="4" strokeDasharray="5 4" />
          <circle cx="60" cy="113" r="6" fill="#f1d078" stroke="#8c642d" strokeWidth="2" />
          <path d="M24 34c-13-5-19-15-16-23 9 1 17 6 22 15m65 2c8-12 17-16 24-11-1 10-8 18-18 22" fill="none" stroke="#e2ad59" strokeWidth="5" strokeLinecap="round" />
          <circle cx="60" cy="20" r="5" fill="#f8df99" />
        </svg>
      </div>
      <div className="welcome-animal welcome-animal--monkey">
        <svg viewBox="0 0 120 140">
          <ellipse cx="60" cy="132" rx="42" ry="7" fill="rgba(39,37,42,.18)" />
          <path d="M87 107c26 8 30 27 11 27-9 0-15-6-11-12 3-4 8-2 9 1" fill="none" stroke="#80502f" strokeWidth="7" strokeLinecap="round" />
          <ellipse cx="60" cy="100" rx="36" ry="32" fill="#a96d42" stroke="#60402f" strokeWidth="4" />
          <path d="M35 119c3-20 15-29 25-29s22 9 25 29l-8 13H43l-8-13Z" fill="#e6b879" stroke="#80502f" strokeWidth="3" />
          <circle cx="27" cy="55" r="18" fill="#a96d42" stroke="#60402f" strokeWidth="4" />
          <circle cx="93" cy="55" r="18" fill="#a96d42" stroke="#60402f" strokeWidth="4" />
          <circle cx="27" cy="55" r="9" fill="#efc5a0" />
          <circle cx="93" cy="55" r="9" fill="#efc5a0" />
          <ellipse cx="60" cy="63" rx="39" ry="40" fill="#b87a4a" stroke="#60402f" strokeWidth="4" />
          <ellipse cx="60" cy="75" rx="24" ry="20" fill="#f4d5aa" />
          <ellipse cx="47" cy="61" rx="5" ry="7" fill="#fff8e4" />
          <ellipse cx="73" cy="61" rx="5" ry="7" fill="#fff8e4" />
          <circle cx="48" cy="62" r="2.8" fill="#302b2a" />
          <circle cx="72" cy="62" r="2.8" fill="#302b2a" />
          <ellipse cx="60" cy="74" rx="7" ry="5" fill="#573a35" />
          <path d="M52 82q8 7 16 0" fill="none" stroke="#70473b" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M44 97c7 5 25 5 32 0" fill="none" stroke="#f2d37b" strokeWidth="5" strokeLinecap="round" />
          <path d="M36 105c8 7 16 10 24 10s16-3 24-10" fill="none" stroke="#16817c" strokeWidth="7" strokeLinecap="round" />
          <circle cx="60" cy="108" r="5" fill="#f6d579" />
          <path d="M40 125 31 134m49-9 9 9" stroke="#60402f" strokeWidth="6" strokeLinecap="round" />
          <path d="M34 39c4-15 16-23 27-23 13 0 23 7 27 22" fill="none" stroke="#efc96f" strokeWidth="5" strokeLinecap="round" />
          <circle cx="60" cy="17" r="5" fill="#f5db91" />
        </svg>
      </div>
      <div className="welcome-animal welcome-animal--elephant">
        <ElephantFigure variant="left" />
      </div>
      <div className="welcome-animal welcome-animal--giraffe">
        <svg viewBox="0 0 120 160">
          <ellipse cx="61" cy="151" rx="36" ry="6" fill="rgba(39,37,42,.16)" />
          <path d="M44 83c-10 3-16 13-15 28l3 34h20l4-39 14 39h19l-4-43c-1-13-11-20-23-22l-18 3Z" fill="#f3c95f" stroke="#80532e" strokeWidth="4" strokeLinejoin="round" />
          <path d="M46 85c-4-18-4-38 0-57 2-11 10-17 21-16 11 1 16 9 15 19l-3 28c-1 11 4 20 11 27" fill="#f3c95f" stroke="#80532e" strokeWidth="5" strokeLinejoin="round" />
          <path d="M48 24c-5-9-14-12-20-7 1 9 8 14 17 15m37-8c7-9 16-10 21-4-3 8-9 12-18 13" fill="#f3c95f" stroke="#80532e" strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="62" cy="21" rx="21" ry="18" fill="#f6d879" stroke="#80532e" strokeWidth="4" />
          <ellipse cx="46" cy="22" rx="6" ry="9" fill="#e5a75d" stroke="#80532e" strokeWidth="2" />
          <ellipse cx="72" cy="17" rx="3" ry="4" fill="#fff9e6" />
          <circle cx="73" cy="18" r="1.8" fill="#302b2a" />
          <path d="M78 27q-6 5-12 1" fill="none" stroke="#80532e" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="56" cy="48" r="5" fill="#b87938" />
          <circle cx="72" cy="65" r="5" fill="#b87938" />
          <circle cx="43" cy="105" r="6" fill="#d99542" />
          <circle cx="70" cy="111" r="6" fill="#d99542" />
          <circle cx="47" cy="132" r="5" fill="#d99542" />
          <circle cx="80" cy="137" r="5" fill="#d99542" />
          <path d="M35 117c13 6 34 7 52 0" fill="none" stroke="#218985" strokeWidth="8" />
          <path d="M45 116h32" stroke="#f8e4a1" strokeWidth="3" strokeDasharray="4 4" />
          <circle cx="61" cy="119" r="5" fill="#f5d476" stroke="#80532e" strokeWidth="2" />
        </svg>
      </div>
      <div className="welcome-lights">
        {Array.from({ length: 11 }, (_, index) => <span key={index} />)}
      </div>
      <span className="welcome-balloon welcome-balloon--one" />
      <span className="welcome-balloon welcome-balloon--two" />
      <span className="welcome-star welcome-star--one">✦</span>
      <span className="welcome-star welcome-star--two">✧</span>
      <span className="welcome-star welcome-star--three">✦</span>
    </div>
  );
}

function CarnivalMagician() {
  return (
    <div className="cover-magician">
      <div className="cover-magician__body">
        <img
          className="cover-magician__image"
          src="/assets/carnival-magician.svg"
          alt="A cheerful circus magician with a purple top hat, blue coat, and golden star wand"
          width="320"
          height="480"
          decoding="async"
        />
      </div>
    </div>
  );
}

function ConfettiCelebration({ onComplete }) {
  const particles = useMemo(() => {
    const isSmallScreen = window.matchMedia("(max-width: 640px)").matches;
    const isLowPower = typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4;
    const particleCount = isSmallScreen || isLowPower ? 72 : 128;
    const shapes = ["paper", "star", "streamer", "ribbon"];

    return Array.from({ length: particleCount }, (_, index) => ({
      id: index,
      shape: shapes[index % shapes.length],
      style: {
        "--left": `${Math.random() * 100}%`,
        "--start-y": `${Math.random() * 88}vh`,
        "--fall-distance": `${110 + Math.round(Math.random() * 30)}vh`,
        "--duration": `${1.8 + Math.random() * 0.9}s`,
        "--delay": `${Math.random() * 0.22}s`,
        "--drift": `${Math.round(Math.random() * 260 - 130)}px`,
        "--size": `${6 + Math.round(Math.random() * 8)}px`,
        "--length": `${24 + Math.round(Math.random() * 42)}px`,
        "--start-rotation": `${Math.round(Math.random() * 90 - 45)}deg`,
        "--rotation": `${Math.round(Math.random() * 720 + 360)}deg`,
        "--particle-color": ["#d83b3b", "#f6952a", "#f8d85a", "#28c5bb", "#127b88", "#8d6de2", "#f7bfda"][index % 7],
      },
    }));
  }, []);
  const remainingParticles = useRef(particles.length);
  const completedRef = useRef(false);

  useEffect(() => {
    const fallbackId = window.setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    }, 3200);
    return () => window.clearTimeout(fallbackId);
  }, [onComplete]);

  const handleParticleEnd = () => {
    remainingParticles.current -= 1;
    if (remainingParticles.current === 0 && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  };

  return (
    <div className="celebration-layer" aria-hidden="true">
      {particles.map(({ id, shape, style }) => (
        <span
          key={id}
          className={`celebration-particle celebration-particle--${shape}`}
          style={style}
          onAnimationEnd={handleParticleEnd}
        >
          {shape === "star" ? "✦" : ""}
        </span>
      ))}
    </div>
  );
}

function TicketClown({ variant }) {
  return (
    <svg className={`ticket-clown ticket-clown--${variant}`} viewBox="0 0 90 120" aria-hidden="true">
      <ellipse cx="45" cy="114" rx="25" ry="4" fill="rgba(56,36,26,.16)" />
      <circle cx="20" cy="37" r="11" fill="#e7463e" stroke="#8e2928" strokeWidth="2" />
      <circle cx="70" cy="37" r="11" fill="#f1c34c" stroke="#8e2928" strokeWidth="2" />
      <path d="M27 80c-9 7-13 18-13 31h62c0-13-5-24-13-31Z" className="ticket-clown-costume" stroke="#7d3430" strokeWidth="3" />
      <path d="m28 81 17 14 17-14-7-8H35Z" fill="#fff1c9" stroke="#b87943" strokeWidth="2" />
      <path d="m35 79 5 6-8 5-6-9m19 4 8-7 8 9-8 7Z" fill="#e8b943" stroke="#9b692e" strokeWidth="1.5" />
      <ellipse cx="45" cy="46" rx="25" ry="29" fill="#fff4df" stroke="#753b34" strokeWidth="3" />
      <circle cx="36" cy="44" r="3" fill="#302b2a" />
      <circle cx="54" cy="44" r="3" fill="#302b2a" />
      <circle cx="45" cy="52" r="5" fill="#dc3d37" stroke="#9e2527" strokeWidth="1.5" />
      <ellipse cx="32" cy="54" rx="5" ry="3" fill="#f39a83" opacity=".8" />
      <ellipse cx="58" cy="54" rx="5" ry="3" fill="#f39a83" opacity=".8" />
      <path d="M37 61q8 8 16 0" fill="none" stroke="#7a342f" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M28 25 37 7l8 12 9-14 6 22Z" fill="#e5bd50" stroke="#85312f" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="54" cy="10" r="4" fill="#e53c3a" stroke="#85312f" strokeWidth="1.5" />
      <path d="M29 84h32l8 27H21Z" className="ticket-clown-costume" stroke="#7d3430" strokeWidth="2.5" />
      <circle cx="45" cy="99" r="3" fill="#f6d979" stroke="#8e5c2c" strokeWidth="1" />
    </svg>
  );
}

function getYouTubeVideoId(url) {
  if (!url || typeof url !== "string") {
    return null;
  }

  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

function PeacockFeather() {
  return (
    <svg className="video-peacock-feather" viewBox="0 0 60 150" aria-hidden="true">
      <path d="M30 145C42 104 9 62 30 8" fill="none" stroke="#b9903f" strokeWidth="3" strokeLinecap="round" />
      <path d="M30 120C12 100 7 78 11 52m19 61c18-20 25-45 19-68M30 91C13 76 15 55 21 35m9 38c13-13 18-29 15-45" fill="none" stroke="#209a91" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="30" cy="24" rx="12" ry="19" fill="#138e91" stroke="#d3ac50" strokeWidth="2" />
      <ellipse cx="30" cy="24" rx="7" ry="12" fill="#2167a0" />
      <ellipse cx="30" cy="24" rx="3.5" ry="7" fill="#392f80" />
    </svg>
  );
}

function VideoCard({ title, description, buttonLabel, videoUrl, localVideoUrl, theme }) {
  const configuredUrl = typeof videoUrl === "string" && videoUrl.trim() && !videoUrl.includes("PASTE_")
    ? videoUrl.trim()
    : "";
  const sourceUrl = configuredUrl || localVideoUrl;
  const videoId = getYouTubeVideoId(sourceUrl);
  const [sourceAvailable, setSourceAvailable] = useState(Boolean(videoId));

  useEffect(() => {
    if (!sourceUrl || videoId) {
      setSourceAvailable(Boolean(videoId));
      return undefined;
    }

    const controller = new AbortController();
    setSourceAvailable(false);

    fetch(sourceUrl, { method: "HEAD", signal: controller.signal })
      .then((response) => setSourceAvailable(response.ok))
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error(`Unable to check video file "${sourceUrl}".`, error);
        }
      });

    return () => controller.abort();
  }, [sourceUrl, videoId]);

  const sectionClassName = `detail-section section-shell video-section video-section--${theme}`;

  if (!sourceAvailable) {
    return (
      <section className={sectionClassName}>
        <div className="section-header">
          <h2>{title}</h2>
        </div>
        <div className="video-placeholder">
          {theme === "krishna" && <PeacockFeather />}
          <img src="/assets/video-placeholder.svg" alt={`${title} video placeholder`} />
          <p>{description}</p>
        </div>
      </section>
    );
  }

  return (
    <section className={sectionClassName}>
      <div className="section-header">
        <h2>{title}</h2>
      </div>
      <div className="video-panel">
        {theme === "krishna" && <PeacockFeather />}
        {videoId ? (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?rel=0`}
            title={title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <video
            controls
            playsInline
            preload="metadata"
            src={sourceUrl}
            onError={() => setSourceAvailable(false)}
          />
        )}
        <a
          href={videoId ? `https://www.youtube.com/watch?v=${videoId}` : sourceUrl}
          className="primary-btn"
          target="_blank"
          rel="noreferrer"
        >
          {buttonLabel}
        </a>
      </div>
    </section>
  );
}

function CoverStage({ isOpening, onOpen }) {
  return (
    <div className={`cover-shell${isOpening ? " cover-shell--opening" : ""}`}>
      <div className="cover-fall-decor" aria-hidden="true">
        <span className="cover-fall-piece piece-1" />
        <span className="cover-fall-piece piece-2" />
        <span className="cover-fall-piece piece-3" />
        <span className="cover-fall-piece piece-4" />
        <span className="cover-fall-piece piece-5" />
        <span className="cover-fall-piece piece-6" />
        <span className="cover-fall-piece piece-7" />
        <span className="cover-fall-piece piece-8" />
        <span className="cover-fall-piece piece-9" />
        <span className="cover-fall-piece piece-10" />
        <span className="cover-fall-piece piece-11" />
        <span className="cover-fall-piece piece-12" />
        <span className="cover-fall-piece piece-13" />
        <span className="cover-fall-piece piece-14" />
      </div>
      <main className="cover-page">
        <div className="cover-card">
          <p className="cover-welcome">THANK YOU FOR A</p>
          <h1 className="cover-headline">ONE-DERFUL</h1>
          <div className="cover-scene" aria-hidden="true">
            <div className="canopy">
              <div className="canopy-bunting" />
              <div className="canopy-bulbs" />
            </div>
            <div className="stage-backdrop" />
            <div className="cover-stars cover-stars-left">✦　✧　✦</div>
            <div className="cover-stars cover-stars-right">✦　✧　✦</div>
            <div className="curtain curtain-left"><span className="curtain-tassel" /></div>
            <div className="curtain curtain-right"><span className="curtain-tassel" /></div>
            <div className="elephant elephant-left"><ElephantFigure variant="left" /></div>
            <div className="elephant elephant-right"><ElephantFigure variant="right" /></div>
            <div className="marquee marquee-bottom" />
          </div>
          <h2 className="cover-title">BIRTHDAY FULL OF MEMORIES</h2>
          <button type="button" className="primary-btn cover-btn" onClick={onOpen} disabled={isOpening}>
            Relive the Memories 🎉
          </button>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [openingState, setOpeningState] = useState(() => (
    typeof window !== "undefined" && window.location.hash ? "open" : "closed"
  ));
  const [showCelebration, setShowCelebration] = useState(false);
  const [showMagician, setShowMagician] = useState(false);

  const handleOpenInvitation = (event) => {
    if (openingState !== "closed") {
      return;
    }

    event.currentTarget.blur();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOpeningState("open");
      return;
    }

    setShowCelebration(true);
    setShowMagician(true);
    setOpeningState("opening");
  };

  const handleMagicianAnimationEnd = (event) => {
    if (event.animationName !== "magicianEntrance") {
      return;
    }

    window.scrollTo({ top: 0, behavior: "auto" });
    setShowMagician(false);
    setOpeningState((state) => state === "opening" ? "open" : state);
  };

  const finishCelebration = useCallback(() => setShowCelebration(false), []);

  useEffect(() => {
    if (openingState !== "opening") {
      return undefined;
    }

    const fallbackId = window.setTimeout(() => {
      setShowMagician(false);
      setOpeningState((state) => state === "opening" ? "open" : state);
    }, 1300);
    return () => window.clearTimeout(fallbackId);
  }, [openingState]);

  useEffect(() => {
    if (openingState !== "open") {
      return undefined;
    }

    const sections = document.querySelectorAll(".invitation-page > .detail-section:not(.welcome-shell)");
    if (!("IntersectionObserver" in window)) {
      sections.forEach((section) => section.classList.add("is-visible"));
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [openingState]);


  return (
    <>
    <div
      className={`invitation-shell memory-site invitation-shell--${openingState}`}
      aria-hidden={openingState !== "open"}
    >
      <main id="top" className="invitation-page">
        <section className="detail-section section-shell welcome-shell">
          <WelcomeDecorations />
          <div className="invitation-message">
            <p className="announcement-banner">THANK YOU SO MUCH! 🎪✨</p>
            <p className="announcement-copy">You made our celebration a great success!</p>
            <p className="invitation-message__body">
              Thank you for attending <span className="highlight-name">Devansh Karthikeya’s</span> <span className="highlight-one">first birthday! 🥳💙</span>
              <br />
              Your love, laughter, and blessings made it a wonderful day. We are so grateful you celebrated with us! 🎂🎪✨
            </p>
          </div>
        </section>

        <section className="detail-section section-shell info-section">
          <div className="section-header align-center">
            <h2>A celebration to remember</h2>
          </div>
          <div className="card-grid">
            <article className="info-card">
              <span className="icon" aria-hidden="true">📅</span>
              <p>Date</p>
              <strong>{eventConfig.date}</strong>
            </article>
            <article className="info-card">
              <span className="icon" aria-hidden="true">⏰</span>
              <p>Time</p>
              <strong>{eventConfig.time}</strong>
            </article>
            <article className="info-card">
              <span className="icon" aria-hidden="true">📍</span>
              <p>Venue</p>
              <strong>{eventConfig.venue}</strong>
            </article>
          </div>
        </section>

        <section className="detail-section section-shell countdown-section">
          <div className="section-header align-center">
            <h2>One wonderful day. Forever memories.</h2>
          </div>
          <p className="memory-note">The birthday candles have been blown out, but the joy of celebrating with you will stay with us forever.</p>
        </section>

        <section className="detail-section section-shell directions-section">
          <div className="section-header align-center">
            <h2>Where the memories were made</h2>
          </div>
          <div className="directions-box">
            <div className="venue-block">
              <h3>{eventConfig.venueName}</h3>
              <p>{eventConfig.venueLocation}</p>
            </div>
            <div className="direction-actions">
              <a href={eventConfig.googleMapsUrl} className="primary-btn" target="_blank" rel="noreferrer">
                View venue on map 📍
              </a>
            </div>
            <div className="contact-grid">
              <a href={`tel:${eventConfig.contactNumbers[0]}`}>Call {eventConfig.contactNumbers[0]}</a>
              <a href={`https://wa.me/91${eventConfig.contactNumbers[0]}`} target="_blank" rel="noreferrer">WhatsApp {eventConfig.contactNumbers[0]}</a>
            </div>
          </div>
        </section>

        <section className="detail-section section-shell timeline-section">
          <div className="section-header align-center">
            <h2>Moments we shared</h2>
          </div>
          <div className="timeline">
            {eventConfig.timeline.map((item, index) => (
              <div key={item} className="timeline-item">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </section>

        <GalleryPreview images={featuredBirthdayPhotos} />

        <section id="birthday-video" className="detail-section section-shell video-section video-section--cinema" aria-labelledby="birthday-video-heading">
          <div className="section-header">
            <h2 id="birthday-video-heading">Birthday Video</h2>
          </div>
          <div className="shoot-poster">
            <p className="shoot-poster__eyebrow">Our special day, captured forever.</p>
            <span className="shoot-poster__stars" aria-hidden="true">✦ ★ ✦</span>
            <h3>Coming Soon</h3>
            <p className="shoot-poster__subtitle">Devansh’s first birthday celebration</p>
            <p className="shoot-poster__note">We can’t wait to share these beautiful memories with you.</p>
          </div>
        </section>

        <section className="detail-section section-shell video-section video-section--cinema">
          <div className="section-header">
            <h2>Our Pre-Birthday Shoot 📸</h2>
          </div>
          <div className="shoot-poster">
            <p className="shoot-poster__eyebrow">A little star. A beautiful story.</p>
            <span className="shoot-poster__stars" aria-hidden="true">✦ ★ ✦</span>
            <h3>Coming Soon</h3>
            <p className="shoot-poster__subtitle">Devansh’s pre-birthday shoot</p>
            <p className="shoot-poster__note">A little more magic is on its way!</p>
          </div>
        </section>

        <VideoCard
          title="Little Krishna 💙🦚"
          description="Enjoy Little Krishna's magical song as we celebrate Devansh."
          buttonLabel="Watch Little Krishna's Magical Song ▶"
          videoUrl={eventConfig.krishnaVideoUrl}
          localVideoUrl={eventConfig.krishnaVideoPath}
          theme="krishna"
        />

        <section className="detail-section section-shell admission-section">
          <div className="admission-ticket">
            <div className="ticket-header">
              <div className="ticket-brand-row">
                <TicketClown variant="coral" />
                <span className="ticket-title">YOUR PASS TO THE MEMORIES</span>
                <TicketClown variant="teal" />
              </div>
              <div className="ticket-star-pass">⭐ A ONE-DERFUL CELEBRATION ⭐</div>
            </div>
            <p className="ticket-edition">SPECIAL GUEST — FOREVER PART OF OUR STORY</p>
            <div className="ticket-privileges">
              <h3>MEMORIES WE WILL TREASURE:</h3>
              <ul>
                <li>The laughter we shared with the people we love.</li>
                <li>The smiles, silly selfies, and happy surprises.</li>
                <li>The cheers and blessings for our birthday boy.</li>
                <li>The wonderful memories you helped us make.</li>
              </ul>
            </div>
            <a className="primary-btn ticket-button" href="#gallery">🎟️ RELIVE THE CELEBRATION</a>
            <p className="ticket-issued">Issued by the Carnival of Devansh.</p>
            <p className="ticket-warning">ONE DAY OF MAGIC. A LIFETIME OF MEMORIES. 🎈</p>
          </div>
        </section>

        <section className="detail-section section-shell closing-section">
          <div className="closing-box">
            <h2>{eventConfig.finalHeading}</h2>
            <p className="closing-message">{eventConfig.finalMessage}</p>
            <p className="signature">With love,
Devansh & Family</p>
          </div>
        </section>
      </main>
    </div>
    {openingState !== "open" && (
      <CoverStage
        isOpening={openingState === "opening"}
        onOpen={handleOpenInvitation}
      />
    )}
    {showMagician && (
      <div className="cover-magician-stage" onAnimationEnd={handleMagicianAnimationEnd}>
        <CarnivalMagician />
      </div>
    )}
    {showCelebration && <ConfettiCelebration onComplete={finishCelebration} />}
    </>
  );
}
