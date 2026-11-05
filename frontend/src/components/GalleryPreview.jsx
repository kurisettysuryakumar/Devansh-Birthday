import { useState } from "react";
import PhotoSlider from "./PhotoSlider.jsx";

export default function GalleryPreview({ images }) {
  const [activeIndex, setActiveIndex] = useState(null);

  return (
    <section id="gallery" className="detail-section section-shell gallery-section gallery-preview" aria-labelledby="gallery-preview-heading">
      <div className="section-header align-center">
        <p className="memory-eyebrow">Little moments. Forever memories.</p>
        <h2 id="gallery-preview-heading">A few favourite memories</h2>
        <p>Eight highlights from a day made special by you.</p>
      </div>
      <div className="gallery-preview__grid">
        {images.map((image, index) => (
          <button
            type="button"
            className="gallery-preview__photo"
            key={image.filename}
            onClick={() => setActiveIndex(index)}
            aria-label={`Enlarge birthday highlight ${index + 1}: ${image.title}`}
          >
            <img
              src={image.url}
              alt={image.alt}
              width="480"
              height="360"
              loading="lazy"
              decoding="async"
            />
          </button>
        ))}
      </div>
      {activeIndex !== null && <PhotoSlider
        images={images}
        initialIndex={activeIndex}
        autoplay={false}
        categoryName="Birthday highlights"
        onClose={() => setActiveIndex(null)}
      />}
    </section>
  );
}
