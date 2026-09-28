import Link from "next/link";
import { plans, CGV_VERSION, freePreviewText, domainText, aiUsageText, cancellationText, priceSuffix, priceTaxText } from "@/lib/commercialPlans";



export default function CGVPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-2xl font-black">
            Lu<span className="text-blue-500">mio</span>
          </Link>

          <Link
            href="/"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-blue-500 hover:text-white"
          >
            ← Accueil
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-14">
        <div className="mb-10">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-blue-400">
            Informations contractuelles
          </p>

          <h1 className="mt-4 text-4xl font-black md:text-5xl">
            Conditions générales de vente
          </h1>

          <p className="mt-5 max-w-3xl leading-7 text-slate-400">
            Version provisoire des conditions commerciales de Lumio.
          </p>

          <p className="mt-3 text-sm font-bold text-blue-300">
            Version des CGV : {CGV_VERSION}
          </p>

          <div className="mt-6 rounded-2xl border border-amber-800 bg-amber-950/30 p-5 text-sm leading-7 text-amber-200">
            ⚠️ Cette version est un brouillon de préparation. Lumio
            n&apos;est pas encore rattaché à une entreprise immatriculée.
            Les champs [À COMPLÉTER] devront être finalisés avant la
            commercialisation. Cette version est pensée principalement pour
            une clientèle professionnelle TPE/PME [À CONFIRMER].
          </div>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">1. Identité du prestataire</h2>

            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              {`Dénomination / nom : [À COMPLÉTER]
Forme juridique : [À COMPLÉTER]
SIREN / SIRET : [À COMPLÉTER]
Adresse : [À COMPLÉTER]
E-mail : [À COMPLÉTER]
Numéro de TVA intracommunautaire : [À COMPLÉTER si applicable]`}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">2. Objet</h2>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Les présentes Conditions générales de vente encadrent la
              souscription et l&apos;utilisation des offres payantes Lumio,
              service permettant notamment de générer, personnaliser,
              sauvegarder et publier des sites internet à l&apos;aide de
              fonctionnalités d&apos;intelligence artificielle.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">
              3. Champ d&apos;application et acceptation
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Les présentes CGV sont destinées principalement aux clients
              agissant dans le cadre de leur activité professionnelle
              [À CONFIRMER]. La souscription à une offre payante implique
              l&apos;acceptation des CGV dans leur version applicable au jour
              de la commande.
            </p>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Si Lumio est ultérieurement proposé à des consommateurs, une
              version adaptée aux règles B2C devra être mise en place avant
              cette commercialisation.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">4. Offres Lumio</h2>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Lumio propose actuellement les formules suivantes. Les
              fonctionnalités affichées sur la page de tarification au moment
              de la souscription constituent la référence commerciale.
            </p>

            <p className="mt-3 text-sm leading-7 text-slate-400">{freePreviewText}</p>
            <p className="mt-3 text-sm leading-7 text-slate-400">{aiUsageText}</p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {plans.map((plan) => (
                <article
                  key={plan.name}
                  className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                >
                  <h3 className="font-black">{plan.name}</h3>
                  <div className="mt-2 text-lg font-black text-blue-400">
                    {plan.price} {priceSuffix}
                  </div>

                  <ul className="mt-4 space-y-2 text-xs leading-5 text-slate-400">
                    {plan.features.map((detail) => (
                      <li key={detail}>• {detail}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            <p className="mt-5 text-xs leading-6 text-slate-500">
              Les prix ci-dessus correspondent aux offres actuellement
              configurées dans Lumio. Toute modification tarifaire future
              devra être affichée avant la souscription ou le renouvellement
              concerné, selon les règles applicables.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">5. Création du compte</h2>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              La souscription nécessite un compte Lumio. Le client est
              responsable de l&apos;exactitude des informations fournies et de
              la confidentialité de ses identifiants. Il doit signaler toute
              utilisation non autorisée de son compte dès qu&apos;il en a
              connaissance.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">
              6. Souscription et formation du contrat
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Le client choisit une formule, prend connaissance du prix et
              des fonctionnalités proposées, puis procède au paiement via
              l&apos;interface prévue à cet effet. Le contrat prend effet
              après validation du paiement et activation de l&apos;abonnement.
            </p>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Avant le lancement commercial, le parcours de commande devra
              comporter une case permettant d&apos;accepter expressément les
              présentes CGV avant le paiement.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">7. Prix et taxes</h2>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              {priceTaxText} Le montant total facturé et sa ventilation sont
              indiqués avant la confirmation de la commande.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">8. Paiement</h2>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Les abonnements sont actuellement réglés par paiement en ligne
              via Stripe. Les informations de carte bancaire sont traitées par
              le prestataire de paiement et ne sont pas destinées à être
              stockées directement par Lumio.
            </p>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Le paiement est exigible lors de la souscription puis à chaque
              échéance de renouvellement de l&apos;abonnement.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">
              9. Durée, renouvellement et résiliation
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Les offres actuellement proposées sont des abonnements
              mensuels. Sauf résiliation, l&apos;abonnement est renouvelé à
              chaque échéance mensuelle.
            </p>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              {cancellationText}
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">
              10. Retard ou défaut de paiement entre professionnels
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Pour les clients professionnels, toute somme non payée à son
              échéance pourra entraîner l&apos;application de pénalités de
              retard calculées, à défaut d&apos;un autre taux fixé dans la
              version définitive des CGV, sur la base du taux directeur
              semestriel de la Banque centrale européenne majoré de 10 points.
            </p>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Une indemnité forfaitaire de 40 € pour frais de recouvrement
              pourra également être due par le client professionnel en retard
              de paiement, sans préjudice d&apos;une indemnisation
              complémentaire lorsque les frais réellement engagés sont
              supérieurs et peuvent être justifiés.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">
              11. Fourniture et disponibilité du service
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Lumio fournit un service en ligne pouvant dépendre de
              prestataires tiers, notamment pour l&apos;hébergement,
              l&apos;authentification, la génération par intelligence
              artificielle, le paiement et la gestion des domaines.
            </p>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Le service peut être temporairement interrompu pour maintenance,
              mise à jour, incident technique ou intervention d&apos;un
              prestataire tiers. Les éventuels engagements de disponibilité
              garantis devront être définis séparément si Lumio décide
              d&apos;en proposer.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">
              12. Contenus générés par intelligence artificielle
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Les textes et autres contenus générés automatiquement peuvent
              contenir des erreurs, approximations ou informations
              inadaptées. Le client doit relire et valider les contenus avant
              leur publication, notamment les informations commerciales,
              juridiques, réglementaires ou professionnelles.
            </p>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Lumio ne garantit pas qu&apos;un contenu généré sera adapté à
              toutes les obligations particulières applicables au secteur
              d&apos;activité du client.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">
              13. Contenus et droits du client
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Le client reste responsable des textes, logos, images, marques,
              noms commerciaux et autres éléments qu&apos;il importe ou
              demande à publier. Il garantit disposer des autorisations
              nécessaires pour leur utilisation.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">
              14. Domaines personnalisés
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              {domainText}
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">
              15. Suspension du service
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Lumio pourra suspendre l&apos;accès à certaines fonctionnalités
              en cas de paiement refusé, utilisation manifestement abusive,
              atteinte à la sécurité du service ou violation grave des
              conditions contractuelles, sous réserve des règles applicables.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">
              16. Droit de rétractation
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Cette version des CGV est préparée pour une clientèle
              professionnelle [À CONFIRMER] et ne contient donc pas de
              dispositif complet de rétractation consommateur.
            </p>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Si Lumio accepte des clients consommateurs, les informations et
              modalités de rétractation applicables aux contrats conclus à
              distance devront être ajoutées au parcours de commande et aux
              CGV avant la commercialisation auprès de ce public.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">
              17. Données personnelles
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Les traitements de données personnelles liés à Lumio sont
              décrits dans la Politique de confidentialité, accessible
              séparément.
            </p>

            <Link
              href="/confidentialite"
              className="mt-4 inline-flex text-sm font-bold text-blue-400 hover:text-blue-300"
            >
              Consulter la Politique de confidentialité →
            </Link>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">18. Responsabilité</h2>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Les règles définitives de responsabilité devront être adaptées
              au futur statut juridique de Lumio, aux garanties réellement
              proposées et au type de clientèle. Aucune exclusion générale de
              responsabilité n&apos;est prévue dans cette version
              préparatoire.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">19. Force majeure</h2>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Aucune partie ne pourra être tenue responsable d&apos;un
              manquement directement causé par un événement de force majeure
              reconnu comme tel par le droit applicable, pendant la durée et
              dans les limites de cet événement.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">
              20. Modification des CGV
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Lumio pourra faire évoluer ses CGV afin de tenir compte des
              évolutions du service, des offres ou de la réglementation. Les
              modalités d&apos;information des clients en cas de modification
              substantielle devront être précisées dans la version
              définitive.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">
              21. Droit applicable et règlement des litiges
            </h2>

            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              {`Droit applicable : [À COMPLÉTER]
Juridiction compétente : [À COMPLÉTER]
Médiation de la consommation : [À COMPLÉTER si une offre B2C est proposée]`}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">22. Contact</h2>

            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              {`E-mail du service client : [À COMPLÉTER]
Adresse postale : [À COMPLÉTER]`}
            </div>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link
            href="/mentions-legales"
            className="text-blue-400 hover:text-blue-300"
          >
            Mentions légales
          </Link>

          <Link
            href="/confidentialite"
            className="text-blue-400 hover:text-blue-300"
          >
            Confidentialité
          </Link>

          <Link
            href="/cgu"
            className="text-blue-400 hover:text-blue-300"
          >
            CGU
          </Link>
        </div>
      </section>
    </main>
  );
}
