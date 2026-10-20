const steps = [
  {
    title: "Décris ton entreprise",
    text: "Indique ton activité, ta ville et les services réellement proposés.",
  },
  {
    title: "Lumio crée une première version",
    text: "L’IA prépare les textes, la structure et une apparence adaptée.",
  },
  {
    title: "Personnalise et vérifie",
    text: "Ajuste le contenu, teste le rendu mobile et utilise l’assistant IA.",
  },
  {
    title: "Enregistre puis publie",
    text: "Ton brouillon reste privé tant que tu ne choisis pas de le publier.",
  },
] as const;

export default function FirstSiteGuide() {
  return (
    <section
      aria-labelledby="first-site-guide-title"
      className="mb-4 rounded-3xl border border-[#343238] bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.2),transparent_45%),#111214] p-5 shadow-2xl shadow-black/20 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.26em] text-violet-300">
            Premier atelier
          </p>
          <h2 id="first-site-guide-title" className="mt-2 font-serif text-2xl font-semibold text-[#f5f0e8]">
            Ton site en quatre étapes
          </h2>
        </div>
        <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-violet-200">
          Environ 5 minutes
        </span>
      </div>
      <ol className="mt-4 grid gap-3 md:grid-cols-4">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="rounded-2xl border border-[#303137] bg-[#0a0b0d]/75 p-4"
          >
            <div className="flex items-center gap-2">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${index === 0 ? "bg-[#f2ede3] text-[#111214]" : "bg-[#222328] text-slate-300"}`}>
                {index + 1}
              </span>
              <h3 className="text-sm font-bold text-[#f5f0e8]">{step.title}</h3>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">{step.text}</p>
          </li>
        ))}
      </ol>
      <p className="mt-5 text-sm font-semibold text-violet-200">
        Commence ci-dessous par les informations de ton entreprise.
      </p>
    </section>
  );
}

