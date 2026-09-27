import Link from "next/link";

import { plans, freePreviewText, domainText, aiUsageText, cancellationText, priceSuffix, priceTaxText } from "@/lib/commercialPlans";



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

    text: "Dès Essentiel, connecte ton propre domaine. Achat et renouvellement du domaine séparés.",

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

    text: "Une fois satisfait de ton aperçu, choisis une formule mensuelle pour publier et partager ton site.",

  },

];







const faqs = [

  { question: "Puis-je essayer avant de payer ?", answer: freePreviewText },

  { question: "Que devient mon site après résiliation ?", answer: cancellationText },

  { question: "Quelles sont les limites de l’IA ?", answer: aiUsageText },

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

      "Oui, dès Essentiel. La connexion est incluse ; tu achètes et renouvelles ton domaine auprès du fournisseur de ton choix.",

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

                Créer mon aperçu gratuit

              </Link>



              <a

                href="/exemples"

                className="rounded-xl border border-slate-700 px-7 py-4 text-center font-black text-slate-200 transition hover:border-blue-500"

              >

                Voir des exemples

              </a>

            </div>



            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-sm text-slate-500">

              <span>✓ Pas besoin de coder</span>

              <span>✓ Édition simple</span>

              <span>✓ Publication en ligne</span>

            </div>

          </div>



          <div className="relative">
            <div className="absolute -inset-8 rounded-[3rem] bg-blue-600/10 blur-3xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-slate-700/80 bg-slate-900 shadow-2xl shadow-blue-950/30">
              <div className="flex items-center justify-between gap-4 border-b border-slate-800 px-4 py-3.5 sm:px-5">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />

                  <span className="ml-2 text-xs font-semibold text-slate-400">
                    SiteAI Builder
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden rounded-full border border-emerald-800 bg-emerald-950/60 px-2.5 py-1 text-[10px] font-bold text-emerald-300 sm:inline-flex">
                    ● Aperçu en direct
                  </span>

                  <div className="hidden items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1 md:flex">
                    <span className="rounded-md bg-slate-800 px-2 py-1 text-[10px] text-slate-300">
                      ▰
                    </span>
                    <span className="px-2 py-1 text-[10px] text-slate-600">
                      ▯
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-3 sm:p-4 md:grid-cols-[0.66fr_1.34fr] md:p-5">
                <aside className="hidden space-y-3 md:block">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                        Éditeur
                      </span>
                      <span className="rounded-md bg-blue-600/15 px-2 py-1 text-[9px] font-bold text-blue-300">
                        Auto
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {[
                        ["✍️", "Contenu", true],
                        ["🎨", "Apparence", false],
                        ["🖼️", "Images", false],
                      ].map(([icon, label, active]) => (
                        <div
                          key={String(label)}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold ${
                            active
                              ? "bg-blue-600 text-white"
                              : "text-slate-400"
                          }`}
                        >
                          <span>{icon}</span>
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Contenu
                    </p>

                    <div className="mt-3 space-y-2">
                      <div>
                        <p className="mb-1 text-[9px] text-slate-500">Entreprise</p>
                        <div className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2 text-[10px] font-semibold text-slate-300">
                          Dupont Plomberie
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="mb-1 text-[9px] text-slate-500">Ville</p>
                          <div className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2 text-[10px] text-slate-300">
                            Montpellier
                          </div>
                        </div>

                        <div>
                          <p className="mb-1 text-[9px] text-slate-500">Style</p>
                          <div className="rounded-lg border border-blue-700/70 bg-blue-950/30 px-2.5 py-2 text-[10px] text-blue-300">
                            Moderne
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="mb-1 text-[9px] text-slate-500">Services</p>
                        <div className="space-y-1.5">
                          {["Dépannage", "Installation", "Rénovation"].map(
                            (service) => (
                              <div
                                key={service}
                                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2 text-[10px] text-slate-300"
                              >
                                <span>{service}</span>
                                <span className="text-emerald-400">✓</span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Couleurs
                      </p>
                      <span className="text-[9px] text-blue-300">Modifier</span>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <div className="h-7 w-7 rounded-full border-2 border-white bg-blue-600" />
                      <div className="h-7 w-7 rounded-full bg-slate-700" />
                      <div className="h-7 w-7 rounded-full bg-emerald-600" />
                      <div className="h-7 w-7 rounded-full bg-orange-500" />
                    </div>
                  </div>
                </aside>

                <div className="overflow-hidden rounded-[1.35rem] border border-slate-700/80 bg-white text-slate-950 shadow-xl shadow-slate-950/20">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-[11px] font-black text-white">
                        DP
                      </div>

                      <div>
                        <p className="text-[11px] font-black sm:text-xs">
                          Dupont Plomberie
                        </p>
                        <p className="text-[8px] text-slate-400 sm:text-[9px]">
                          Plomberie • Montpellier
                        </p>
                      </div>
                    </div>

                    <div className="hidden items-center gap-3 text-[9px] font-semibold text-slate-500 sm:flex">
                      <span>Services</span>
                      <span>À propos</span>
                      <span>Contact</span>
                    </div>
                  </div>

                  <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-5 py-9 text-white sm:px-7 sm:py-11">
                    <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />
                    <div className="absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />

                    <div className="relative max-w-md">
                      <div className="inline-flex rounded-full border border-blue-400/25 bg-blue-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-blue-200 sm:text-[10px]">
                        Intervention rapide
                      </div>

                      <h2 className="mt-4 max-w-sm text-3xl font-black leading-[1.04] sm:text-4xl">
                        Votre plombier de confiance à Montpellier
                      </h2>

                      <p className="mt-4 max-w-sm text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6">
                        Dépannage, chauffe-eau et rénovation pour particuliers
                        et professionnels.
                      </p>

                      <div className="mt-6 flex flex-wrap items-center gap-2">
                        <div className="inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-[11px] font-black sm:px-5 sm:py-3 sm:text-sm">
                          Nous contacter
                        </div>

                        <div className="inline-flex rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-[11px] font-bold text-slate-200 sm:px-5 sm:py-3 sm:text-sm">
                          Voir les services
                        </div>
                      </div>

                      <div className="mt-7 flex flex-wrap gap-x-4 gap-y-2 text-[9px] font-medium text-slate-400 sm:text-[10px]">
                        <span>✓ Devis rapide</span>
                        <span>✓ Intervention locale</span>
                        <span>✓ Contact simple</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 sm:p-4">
                    <div className="mb-3 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-600">
                          Nos services
                        </p>
                        <p className="mt-1 text-xs font-black text-slate-900 sm:text-sm">
                          Une solution pour chaque besoin
                        </p>
                      </div>

                      <span className="hidden text-[9px] text-slate-400 sm:inline">
                        Découvrir →
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      {[
                        ["🔧", "Dépannage"],
                        ["🚿", "Installation"],
                        ["🏠", "Rénovation"],
                      ].map(([icon, item]) => (
                        <div
                          key={item}
                          className="min-w-0 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3.5"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-sm sm:h-8 sm:w-8">
                            {icon}
                          </div>

                          <div className="mt-2 truncate text-[9px] font-black text-slate-900 sm:text-xs">
                            {item}
                          </div>

                          <div className="mt-2 h-1.5 w-full rounded bg-slate-100" />
                          <div className="mt-1.5 h-1.5 w-2/3 rounded bg-slate-100" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/60 px-4 py-3 text-[10px] text-slate-500 sm:px-5">
                <span>Modifications enregistrées automatiquement</span>
                <span className="font-bold text-emerald-400">✓ Enregistré</span>
              </div>
            </div>
          </div>

        </div>

      </section>



      <section id="exemples" className="mx-auto max-w-7xl px-6 py-16">

        <p className="text-sm font-bold uppercase tracking-widest text-blue-400">Pour les petites entreprises</p>

        <h2 className="mt-3 text-3xl font-black">Un site concret pour ton métier</h2>

        <p className="mt-3 text-slate-400">Explore nos démonstrations fictives, puis personnalise ton propre site.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">{["Plombier", "Restaurant", "Paysagiste"].map(metier => <Link key={metier} href="/exemples" className="rounded-2xl border border-slate-700 bg-slate-900 p-6 transition hover:border-blue-500"><p className="text-xs text-slate-400">Démonstration</p><h3 className="mt-2 text-xl font-bold">{metier}</h3><p className="mt-4 text-sm text-blue-300">Explorer les modèles →</p></Link>)}</div>

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

              Un aperçu gratuit pour commencer. Essentiel pour ton entreprise, Pro pour davantage d’IA, Agence pour plusieurs clients.

            </p>

          </div>



          <div className="mt-7 text-center"><Link href="/auth" className="inline-flex rounded-xl bg-blue-600 px-6 py-3 font-bold hover:bg-blue-500">Créer mon aperçu gratuit</Link><p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">{freePreviewText}</p></div>

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

                    Recommandé

                  </span>

                )}



                <h3 className="pt-8 text-2xl font-black">{plan.name}</h3>

                <p className="mt-4 min-h-12 text-sm leading-6 text-slate-400">

                  {plan.description}

                </p>



                <div className="mt-7 flex items-end gap-2">

                  <span className="text-4xl font-black">{plan.price}</span>

                  <span className="pb-1 text-slate-300">{priceSuffix}</span>

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

          <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-6 text-slate-400">{priceTaxText}</p>

        </div>

      </section>





        <section aria-label="Ce qui est inclus" className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">

            <h2 className="font-bold text-white">Ton domaine, ton adresse</h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">{domainText}</p>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">

            <h2 className="font-bold text-white">Une IA avec des limites claires</h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">{aiUsageText}</p>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">

            <h2 className="font-bold text-white">Si tu résilies</h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">{cancellationText}</p>

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
