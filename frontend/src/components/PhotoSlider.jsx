import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./PhotoSlider.css";

export default function PhotoSlider({ images, initialIndex, autoplay, onClose, categoryName }) {
  const dialogRef = useRef(null);
  const touchStart = useRef(null);
  const [index, setIndex] = useState(initialIndex);
  const [playing, setPlaying] = useState(autoplay);
  const [loadedUrl, setLoadedUrl] = useState(null);
  const [failedUrl, setFailedUrl] = useState(null);
  const image = images[index];
  const titleId = useId();
  const navigate = useCallback((direction) => {
    setIndex((current) => (current + direction + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Wait for the current photo before starting its four-second display time.
  useEffect(() => {
    if (!playing || images.length < 2 || (loadedUrl !== image.url && failedUrl !== image.url)) return undefined;
    const timer = window.setTimeout(() => navigate(1), 4000);
    return () => window.clearTimeout(timer);
  }, [playing, image.url, loadedUrl, failedUrl, images.length, navigate]);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);

  useEffect(() => {
    // Fetch only the next preview, never full-resolution originals during playback.
    if (images.length < 2) return;
    const next = new Image();
    next.src = images[(index + 1) % images.length].url;
  }, [index, images]);

  const stepManually = (direction) => {
    setPlaying(false);
    navigate(direction);
  };

  const handleKeyDown = (event) => {
    // Keep native keyboard activation of links and buttons intact.
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      stepManually(event.key === "ArrowRight" ? 1 : -1);
    } else if (event.code === "Space" && event.target === dialogRef.current) {
      event.preventDefault();
      setPlaying((current) => !current);
    }
  };

  const failed = failedUrl === image.url;

  return createPortal(
    <dialog
      ref={dialogRef}
      className="birthday-slider"
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={handleKeyDown}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="birthday-slider__layout">
        <header className="birthday-slider__header">
          <div>
            <p className="birthday-slider__category">{categoryName}</p>
            <h3 id={titleId}>{image.title}</h3>
          </div>
          <span className="birthday-slider__counter" aria-live={playing ? "off" : "polite"}>
            {index + 1} / {images.length}
          </span>
          <button type="button" className="birthday-slider__close" onClick={onClose} aria-label="Close photo viewer" autoFocus>
            &times;
          </button>
        </header>

        <div
          className="birthday-slider__stage"
          onTouchStart={(event) => {
            touchStart.current = event.touches.length === 1
              ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
          }}
          onTouchCancel={() => { touchStart.current = null; }}
          onTouchEnd={(event) => {
            const start = touchStart.current;
            touchStart.current = null;
            if (!start || !event.changedTouches.length) return;
            const dx = event.changedTouches[0].clientX - start.x;
            const dy = event.changedTouches[0].clientY - start.y;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) stepManually(dx < 0 ? 1 : -1);
          }}
          aria-label="Enlarged photo. Swipe or use arrow keys to change photos."
        >
          {loadedUrl !== image.url && !failed && <span className="birthday-slider__status" role="status">Loading photo…</span>}
          {failed ? (
            <p className="birthday-slider__status" role="status">Photo unavailable. Please try another highlight.</p>
          ) : (
            <img
              key={image.url}
              className="birthday-slider__photo"
              src={image.url}
              alt={image.alt}
              decoding="async"
              onLoad={() => setLoadedUrl(image.url)}
              onError={() => setFailedUrl(image.url)}
              draggable="false"
            />
          )}
          {images.length > 1 && <>
            <button type="button" className="birthday-slider__arrow birthday-slider__arrow--previous" onClick={() => stepManually(-1)} aria-label="Previous photo">&lsaquo;</button>
            <button type="button" className="birthday-slider__arrow birthday-slider__arrow--next" onClick={() => stepManually(1)} aria-label="Next photo">&rsaquo;</button>
          </>}
        </div>

        <footer className="birthday-slider__footer">
          <div className="birthday-slider__actions">
            {images.length > 1 && <button type="button" onClick={() => setPlaying((current) => !current)} aria-pressed={playing}>
              {playing ? "Pause slideshow" : "Play slideshow"}
            </button>}
            <a href={image.url} target="_blank" rel="noopener noreferrer" onClick={() => setPlaying(false)}>Open photo</a>
            <a className="birthday-slider__download" href={image.url} download={image.filename || ""} onClick={() => setPlaying(false)}>
              Download photo
            </a>
          </div>
          <p>Use ← → keys or swipe to browse. Esc to close.</p>
        </footer>
      </div>
    </dialog>,
    document.body,
  );
}
