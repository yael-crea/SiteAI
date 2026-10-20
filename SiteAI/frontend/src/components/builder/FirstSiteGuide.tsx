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
      className="mb-4 rounded-2xl border border-blue-900/70 bg-gradient-to-r from-blue-950/45 to-violet-950/30 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
            Premier site
          </p>
          <h2 id="first-site-guide-title" className="mt-1 text-lg font-black">
            Ton site en quatre étapes
          </h2>
        </div>
        <span className="rounded-full bg-blue-500/15 px-3 py-1.5 text-xs font-bold text-blue-200">
          Environ 5 minutes
        </span>
      </div>
      <ol className="mt-4 grid gap-3 md:grid-cols-4">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="rounded-xl border border-slate-700/80 bg-slate-950/55 p-3"
          >
            <div className="flex items-center gap-2">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${index === 0 ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"}`}>
                {index + 1}
              </span>
              <h3 className="text-sm font-bold text-slate-100">{step.title}</h3>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">{step.text}</p>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm font-semibold text-blue-200">
        Commence ci-dessous par les informations de ton entreprise.
      </p>
    </section>
  );
}

