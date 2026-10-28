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
          <h1 className="mt-4 text-4xl font-black md:text-5xl">Mentions légales</h1>
          <p className="mt-5 max-w-3xl leading-7 text-slate-400">
            Cette page présente les informations relatives à l’éditeur du service Lumio et à son hébergement.
          </p>

          <div className="mt-6 rounded-2xl border border-amber-800 bg-amber-950/30 p-5 text-sm leading-7 text-amber-200">
            ⚠️ Version provisoire : Lumio n&apos;est pas encore rattaché à une
            entreprise immatriculée. Tous les champs marqués [À COMPLÉTER]
            devront être renseignés avant une mise en ligne commerciale.
          </div>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">1. Éditeur du site</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Nom / dénomination : [À COMPLÉTER]
Statut juridique : [À COMPLÉTER après création de l’entreprise]
SIREN / SIRET : [À COMPLÉTER]
Adresse du siège : [À COMPLÉTER]
E-mail de contact : [À COMPLÉTER]
Téléphone : [À COMPLÉTER si applicable]
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">2. Directeur de la publication</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Directeur de la publication : [À COMPLÉTER]
Cette information devra correspondre à la personne juridiquement responsable de la publication du service.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">3. Hébergement et infrastructure</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Le service Lumio utilise actuellement plusieurs prestataires techniques.

Frontend / déploiement : Vercel
Backend : Railway
Base de données et authentification : Supabase

Les coordonnées légales complètes des prestataires devront être ajoutées ou vérifiées avant la mise en production commerciale : [À COMPLÉTER].
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">4. Propriété intellectuelle</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              La marque, l’interface, les éléments graphiques et le code propres à Lumio sont protégés dans les conditions prévues par le droit applicable, sous réserve des droits détenus par des tiers.

Les utilisateurs restent responsables des contenus, marques, logos, images et autres éléments qu’ils importent ou publient dans les sites créés avec Lumio.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">5. Contact</h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              Pour toute question concernant Lumio :{" "}
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
