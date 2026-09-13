const MORROW_SIGNATURE_PREVIEW = [
  {
    name: "Open Wound",
    cost: 1,
    category: "Attack · Common",
    ingredient: "Gore · Prime 1 (Material)",
    effect: "Deal 7 attack damage. Apply 2 Bleed.",
  },
  {
    name: "Bone Saw",
    cost: 2,
    category: "Attack · Uncommon",
    ingredient: "Gore · Prime 1 (Material)",
    effect: "Deal 4 attack damage 3 times.",
  },
  {
    name: "Thick Skin",
    cost: 1,
    category: "Protocol · Uncommon",
    ingredient: "No ingredient",
    effect: "Deploy. Once per turn after a Source Lead card, gain 3 Block.",
  },
  {
    name: "Unlicensed Procedure",
    cost: 2,
    category: "Attack · Rare",
    ingredient: "Gore · Prime 1 (Material)",
    effect: "Pay 3 HP. Deal 16 attack damage.",
  },
] as const;

export function CardGallery() {
  return (
    <main className="combat-shell">
      <header className="combat-header">
        <div>
          <p className="eyebrow">CARD VISUAL PREVIEW</p>
          <h1>Morrow Signature Set</h1>
        </div>
      </header>

      <section className="hand-section" aria-labelledby="preview-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">BASE VERSION · MOCKUP ART</p>
            <h2 id="preview-heading">Four Source signatures</h2>
          </div>
          <span>Presentation preview only · gameplay data unchanged</span>
        </div>

        <div
          className="hand"
          style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
          data-testid="morrow-card-gallery"
        >
          {MORROW_SIGNATURE_PREVIEW.map((card) => (
            <div className="card-slot" key={card.name}>
              <button
                type="button"
                className="play-card owner-source"
                data-card-name={card.name}
                aria-label={`${card.name} visual preview`}
              >
                <span className="card-cost">{card.cost}</span>
                <span className="card-owner">SOURCE · MORROW</span>
                <strong>{card.name}</strong>
                <span className="card-classification">{card.category}</span>
                <span className="card-ingredient">{card.ingredient}</span>
                <span className="card-effect">{card.effect}</span>
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
