import Link from "next/link";

const features = [
  {
    icon: "✨",
    title: "Création avec l’IA",
    text: "Décris ton activité et SiteAI génère la base de ton site professionnel.",
  },
  {
    icon: "✍️",
    title: "Éditeur simple",
    text: "Modifie les textes, les sections, les couleurs, le logo et les images sans repartir de zéro.",
  },
  {
    icon: "🚀",
    title: "Publication rapide",
    text: "Sauvegarde ton site puis publie-le avec une adresse publique SiteAI.",
  },
  {
    icon: "🌐",
    title: "Domaine personnalisé",
    text: "Avec Pro ou Agence, connecte ton propre nom de domaine à ton site.",
  },
  {
    icon: "🖼️",
    title: "Galerie photos",
    text: "Ajoute et réorganise les images qui présentent ton entreprise, tes réalisations ou tes services.",
  },
  {
    icon: "💳",
    title: "Abonnement intégré",
    text: "Gère ta formule et tes paiements directement depuis ton espace SiteAI.",
  },
];

const steps = [
  {
    number: "01",
    title: "Présente ton entreprise",
    text: "Indique ton activité, ta ville, tes services et ton style.",
  },
  {
    number: "02",
    title: "Laisse l’IA créer",
    text: "SiteAI prépare une première version que tu peux ensuite personnaliser.",
  },
  {
    number: "03",
    title: "Publie ton site",
    text: "Enregistre, publie et partage immédiatement ton adresse avec tes clients.",
  },
];

const plans = [
  {
    name: "Essentiel",
    price: "19,90 €",
    description: "Pour démarrer avec un site professionnel.",
    features: [
      "1 site publié",
      "Génération avec l’IA",
      "Éditeur manuel",
      "URL publique SiteAI",
      "Sauvegarde du site",
    ],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "39,90 €",
    description: "Pour développer une présence en ligne plus complète.",
    features: [
      "Jusqu’à 3 sites publiés",
      "Toutes les fonctions Essentiel",
      "Galerie photos",
      "Domaine personnalisé",
      "Modification avec l’IA",
    ],
    highlighted: true,
  },
  {
    name: "Agence",
    price: "79,90 €",
    description: "Pour gérer plusieurs sites depuis un même compte.",
    features: [
      "Jusqu’à 10 sites publiés",
      "Toutes les fonctions Pro",
      "Domaines personnalisés",
      "Gestion multi-sites",
      "Pensé pour agences et freelances",
    ],
    highlighted: false,
  },
];

const faqs = [
  {
    question: "Est-ce que je dois savoir coder ?",
    answer:
      "Non. SiteAI est pensé pour créer et modifier un site depuis une interface simple, sans écrire de code.",
  },
  {
    question: "Puis-je modifier le site après sa création ?",
    answer:
      "Oui. Tu peux modifier le contenu, les sections, les couleurs, le logo, les images et enregistrer tes changements.",
  },
  {
    question: "Puis-je utiliser mon propre domaine ?",
    answer:
      "Oui avec les formules Pro et Agence. La formule Essentiel utilise l’adresse publique SiteAI.",
  },
  {
    question: "Puis-je changer de formule ?",
    answer:
      "Oui. La gestion de l’abonnement est intégrée à SiteAI et passe par Stripe.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="text-2xl font-black">
            Site<span className="text-blue-500">AI</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
            <a href="#fonctionnalites" className="hover:text-white">
              Fonctionnalités
            </a>
            <a href="#comment-ca-marche" className="hover:text-white">
              Comment ça marche
            </a>
            <a href="#tarifs" className="hover:text-white">
              Tarifs
            </a>
            <a href="#faq" className="hover:text-white">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/auth"
              className="hidden rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-blue-500 sm:inline-flex"
            >
              Se connecter
            </Link>

            <Link
              href="/auth"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black transition hover:bg-blue-500"
            >
              Créer mon site
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.20),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(124,58,237,0.16),transparent_30%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-14 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-900 bg-blue-950/40 px-4 py-2 text-sm font-bold text-blue-300">
              ✨ Création de sites avec l’IA
            </div>

            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[1.05] md:text-7xl">
              Le site de ton entreprise,
              <span className="block text-blue-500">
                créé avec l&apos;IA.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-400 md:text-xl">
              SiteAI aide les indépendants, TPE et PME à créer, personnaliser
              et publier un site professionnel depuis une seule interface.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auth"
                className="rounded-xl bg-blue-600 px-7 py-4 text-center font-black transition hover:bg-blue-500"
              >
                Commencer avec SiteAI
              </Link>

              <a
                href="#tarifs"
                className="rounded-xl border border-slate-700 px-7 py-4 text-center font-black text-slate-200 transition hover:border-blue-500"
              >
                Voir les tarifs
              </a>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-sm text-slate-500">
              <span>✓ Pas besoin de coder</span>
              <span>✓ Édition simple</span>
              <span>✓ Publication en ligne</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-5 rounded-[2.5rem] bg-blue-600/10 blur-3xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-slate-700 bg-slate-900 shadow-2xl shadow-blue-950/30">
              <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-4">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-3 text-xs font-semibold text-slate-500">
                  SiteAI Builder
                </span>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-[0.78fr_1.22fr]">
                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <div className="h-3 w-24 rounded-full bg-slate-700" />
                    <div className="mt-4 h-11 rounded-xl border border-slate-800 bg-slate-900" />
                    <div className="mt-3 h-11 rounded-xl border border-slate-800 bg-slate-900" />
                    <div className="mt-3 h-24 rounded-xl border border-slate-800 bg-slate-900" />
                    <div className="mt-4 h-11 rounded-xl bg-blue-600" />
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <div className="h-3 w-20 rounded-full bg-slate-700" />
                    <div className="mt-4 flex gap-2">
                      <div className="h-9 w-9 rounded-full bg-blue-600" />
                      <div className="h-9 w-9 rounded-full bg-orange-600" />
                      <div className="h-9 w-9 rounded-full bg-emerald-600" />
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl bg-white text-slate-950">
                  <div className="relative min-h-[380px] bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-7 text-white">
                    <div className="flex items-center justify-between">
                      <div className="font-black">Dupont Plomberie</div>
                      <div className="text-xs text-slate-300">Montpellier</div>
                    </div>

                    <div className="mt-20 max-w-md">
                      <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
                        Intervention rapide
                      </div>
                      <div className="mt-4 text-4xl font-black leading-tight">
                        Votre plombier de confiance
                      </div>
                      <div className="mt-4 max-w-sm text-sm leading-6 text-slate-300">
                        Dépannage, chauffe-eau et rénovation pour particuliers
                        et professionnels.
                      </div>
                      <div className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-black">
                        Nous contacter
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 p-5 sm:grid-cols-3">
                    {["Dépannage", "Installation", "Rénovation"].map(
                      (item) => (
                        <div
                          key={item}
                          className="rounded-xl border border-slate-200 p-4"
                        >
                          <div className="text-sm font-black">{item}</div>
                          <div className="mt-2 h-2 w-full rounded bg-slate-100" />
                          <div className="mt-2 h-2 w-2/3 rounded bg-slate-100" />
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="fonctionnalites"
        className="border-y border-slate-800 bg-slate-900/40"
      >
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-blue-400">
              Tout au même endroit
            </p>

            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Créer un site ne devrait pas être compliqué.
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-400">
              SiteAI regroupe la génération, l&apos;édition, la publication et
              la gestion de tes sites dans un même espace.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-3xl border border-slate-800 bg-slate-950 p-7"
              >
                <div className="text-3xl">{feature.icon}</div>
                <h3 className="mt-5 text-xl font-black">{feature.title}</h3>
                <p className="mt-3 leading-7 text-slate-400">{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="comment-ca-marche" className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-blue-400">
            3 étapes
          </p>

          <h2 className="mt-4 text-4xl font-black md:text-5xl">
            De l&apos;idée au site publié.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.number}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-7"
            >
              <div className="text-sm font-black tracking-[0.3em] text-blue-400">
                {step.number}
              </div>
              <h3 className="mt-5 text-2xl font-black">{step.title}</h3>
              <p className="mt-3 leading-7 text-slate-400">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="tarifs" className="border-y border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-blue-400">
              Tarifs
            </p>
            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Une formule selon tes besoins.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-400">
              Commence avec Essentiel puis évolue vers Pro ou Agence lorsque
              ton activité en a besoin.
            </p>
          </div>

          <div className="mt-12 grid gap-7 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`relative flex flex-col rounded-3xl border p-7 ${
                  plan.highlighted
                    ? "border-blue-500 bg-blue-500/10 shadow-2xl shadow-blue-950/30"
                    : "border-slate-800 bg-slate-950"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute right-5 top-5 rounded-full bg-blue-600 px-3 py-1 text-xs font-black uppercase tracking-wider">
                    Populaire
                  </span>
                )}

                <h3 className="text-2xl font-black">{plan.name}</h3>
                <p className="mt-4 min-h-12 text-sm leading-6 text-slate-400">
                  {plan.description}
                </p>

                <div className="mt-7 flex items-end gap-2">
                  <span className="text-4xl font-black">{plan.price}</span>
                  <span className="pb-1 text-slate-300">/ mois</span>
                </div>

                <ul className="mt-8 flex-1 space-y-4">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex gap-3 text-sm text-slate-300"
                    >
                      <span className="font-black text-emerald-400">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/auth"
                  className={`mt-9 block rounded-xl px-5 py-4 text-center font-black ${
                    plan.highlighted
                      ? "bg-blue-600 hover:bg-blue-500"
                      : "bg-white text-slate-950 hover:bg-slate-200"
                  }`}
                >
                  Choisir {plan.name}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-5xl px-6 py-20">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-blue-400">
            FAQ
          </p>
          <h2 className="mt-4 text-4xl font-black md:text-5xl">
            Questions fréquentes
          </h2>
        </div>

        <div className="mt-12 grid gap-4">
          {faqs.map((faq) => (
            <article
              key={faq.question}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
            >
              <h3 className="font-black">{faq.question}</h3>
              <p className="mt-3 leading-7 text-slate-400">{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-blue-800 bg-gradient-to-br from-blue-950 to-slate-900 p-8 text-center md:p-14">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-blue-300">
            Prêt à créer ton site ?
          </p>
          <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-black md:text-5xl">
            Présente ton entreprise en ligne avec SiteAI.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl leading-7 text-slate-300">
            Crée ton compte, génère ton premier site et personnalise-le depuis
            ton espace.
          </p>

          <Link
            href="/auth"
            className="mt-8 inline-flex rounded-xl bg-white px-7 py-4 font-black text-slate-950 hover:bg-slate-200"
          >
            Créer mon compte
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 px-6 py-8 text-sm text-slate-300 md:flex-row md:items-center">
          <div>
            <span className="font-black text-white">
              Site<span className="text-blue-500">AI</span>
            </span>{" "}
            — Création de sites avec l&apos;IA.
          </div>

          <div className="flex flex-wrap gap-5">
            <a href="#fonctionnalites" className="hover:text-white">
              Fonctionnalités
            </a>
            <a href="#tarifs" className="hover:text-white">
              Tarifs
            </a>
            <Link href="/mentions-legales" className="hover:text-white">
              Mentions légales
            </Link>
            <Link href="/confidentialite" className="hover:text-white">
              Confidentialité
            </Link>
            <Link href="/cgu" className="hover:text-white">
              CGU
            </Link>
            <Link href="/cgv" className="hover:text-white">
              CGV
            </Link>
            <Link href="/auth" className="hover:text-white">
              Connexion
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
