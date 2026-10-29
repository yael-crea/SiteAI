import Link from "next/link";
import "../app-theme.css";

export default function LegalPage() {
  return (
    <main className="lumio-app min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-2xl font-black">
            Lu<span className="text-blue-500">mio</span>
          </Link>

          <Link
            href="/"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-blue-500"
          >
            ← Accueil
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-14">
        <div className="mb-10">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-blue-400">
            Informations légales
          </p>
          <h1 className="mt-4 text-4xl font-black md:text-5xl">Conditions générales d’utilisation</h1>
          <p className="mt-5 max-w-3xl leading-7 text-slate-400">
            Les présentes CGU constituent une base provisoire pour définir les règles d’utilisation de Lumio. Elles devront être revues et complétées avant une commercialisation.
          </p>

          <div className="mt-6 rounded-2xl border border-amber-800 bg-amber-950/30 p-5 text-sm leading-7 text-amber-200">
            ⚠️ Version provisoire : ces conditions devront être relues et
            finalisées avant la commercialisation de Lumio.
          </div>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">1. Objet</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Lumio est un service permettant notamment de générer, personnaliser, sauvegarder et publier des sites internet avec l’aide de fonctionnalités d’intelligence artificielle.

Les présentes CGU encadrent l’accès à la plateforme et son utilisation.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">2. Compte utilisateur</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              L’utilisateur doit fournir des informations exactes lors de la création de son compte et préserver la confidentialité de ses identifiants.

L’utilisateur est responsable des actions réalisées depuis son compte, sauf lorsqu’elles résultent d’un incident imputable au service ou d’un accès frauduleux dont il n’est pas responsable.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">3. Utilisation autorisée</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              L’utilisateur s’engage à ne pas utiliser Lumio pour :
• publier des contenus manifestement illicites ;
• porter atteinte aux droits de tiers ;
• importer du contenu sans disposer des droits nécessaires ;
• contourner les limitations techniques ou commerciales de la plateforme ;
• perturber, attaquer ou tenter d’accéder sans autorisation à l’infrastructure du service.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">4. Contenus générés par intelligence artificielle</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Les contenus générés par Lumio peuvent contenir des erreurs, approximations ou formulations inadaptées.

L’utilisateur doit vérifier les textes, images, informations professionnelles, mentions réglementaires et autres contenus avant publication. La génération automatique ne remplace pas une validation humaine lorsque celle-ci est nécessaire.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">5. Contenus de l’utilisateur</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              L’utilisateur demeure responsable des contenus qu’il fournit, importe ou publie via Lumio.

Il doit notamment disposer des droits nécessaires sur les logos, marques, photographies, textes et autres contenus utilisés dans ses sites.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">6. Disponibilité du service</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Lumio peut faire l’objet d’opérations de maintenance, de mises à jour ou d’interruptions techniques.

Les engagements précis de disponibilité, de support et, le cas échéant, de niveau de service devront être définis avant commercialisation.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">7. Abonnements et paiement</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Lumio prévoit des formules d’abonnement payantes.

Les conditions tarifaires, modalités de paiement, renouvellement, résiliation, remboursement et éventuel droit de rétractation devront être précisées dans des Conditions générales de vente (CGV) distinctes avant la commercialisation du service.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">8. Suspension ou fermeture de compte</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Un compte pourra être suspendu ou fermé dans les conditions qui seront précisées dans la version définitive des CGU, notamment en cas de violation grave ou répétée des règles d’utilisation.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">9. Responsabilité</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Les règles précises de responsabilité devront être adaptées au statut juridique de l’entreprise, au public visé et aux services effectivement proposés.

Aucune clause définitive de limitation de responsabilité n’est insérée dans cette version provisoire.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">10. Droit applicable et litiges</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Droit applicable : droit français.
Règlement des litiges : En cas de litige, les parties recherchent d’abord une solution amiable. À défaut, le litige est porté devant les tribunaux compétents ; lorsque l’utilisateur est un professionnel, compétence est attribuée aux tribunaux du ressort de Montpellier.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">11. Contact</h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              Contact Lumio :{" "}
              <a href="mailto:support@lumio.business" className="text-blue-400 hover:text-blue-300">
                support@lumio.business
              </a>
            </p>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href="/mentions-legales" className="text-blue-400 hover:text-blue-300">
            Mentions légales
          </Link>
          <Link href="/confidentialite" className="text-blue-400 hover:text-blue-300">
            Confidentialité
          </Link>
          <Link href="/cgu" className="text-blue-400 hover:text-blue-300">
            CGU
          </Link>
        </div>
      </section>
    </main>
  );
}
