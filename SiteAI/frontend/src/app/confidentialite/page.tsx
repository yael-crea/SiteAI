import Link from "next/link";

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-2xl font-black">
            Site<span className="text-blue-500">AI</span>
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
          <h1 className="mt-4 text-4xl font-black md:text-5xl">Politique de confidentialité</h1>
          <p className="mt-5 max-w-3xl leading-7 text-slate-400">
            Cette politique décrit de manière provisoire les principales catégories de données utilisées par SiteAI. Elle devra être adaptée aux traitements réellement déployés au moment du lancement.
          </p>

          <div className="mt-6 rounded-2xl border border-amber-800 bg-amber-950/30 p-5 text-sm leading-7 text-amber-200">
            ⚠️ Version provisoire : SiteAI n&apos;est pas encore rattaché à une
            entreprise immatriculée. Tous les champs marqués [À COMPLÉTER]
            devront être renseignés avant une mise en ligne commerciale.
          </div>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">1. Responsable du traitement</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Responsable du traitement : [À COMPLÉTER après création de l’entreprise]
Adresse : [À COMPLÉTER]
E-mail relatif aux données personnelles : [À COMPLÉTER]
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">2. Données susceptibles d’être traitées</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Selon l’utilisation de SiteAI, les données peuvent notamment inclure :
• adresse e-mail et informations de compte ;
• informations fournies lors de la création d’un site ;
• contenus, textes, images, logos et domaines ajoutés par l’utilisateur ;
• informations liées à l’abonnement et au statut de paiement ;
• journaux techniques nécessaires à la sécurité, au diagnostic et au fonctionnement du service.

Les données de carte bancaire ne sont pas destinées à être stockées directement par SiteAI lorsque le paiement est traité par Stripe.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">3. Finalités</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Les données peuvent être utilisées pour :
• créer et gérer le compte utilisateur ;
• générer, sauvegarder, modifier et publier des sites ;
• gérer les abonnements et les paiements ;
• connecter des domaines personnalisés ;
• assurer la sécurité et le bon fonctionnement du service ;
• répondre aux demandes de support ;
• respecter les obligations légales applicables.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">4. Bases juridiques</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Les bases juridiques exactes devront être validées avant le lancement.

Selon le traitement, SiteAI pourra notamment s’appuyer sur :
• l’exécution du contrat pour fournir le service ;
• le respect d’une obligation légale ;
• l’intérêt légitime pour certaines opérations de sécurité et de prévention des abus ;
• le consentement lorsque celui-ci est requis, notamment pour certains traceurs ou communications facultatives.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">5. Prestataires techniques</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              SiteAI utilise actuellement ou prévoit d’utiliser notamment :
• Supabase pour l’authentification, le stockage et la base de données ;
• Stripe pour les paiements et abonnements ;
• Vercel pour le frontend et le déploiement ;
• Railway pour le backend ;
• OpenAI pour certaines fonctions de génération assistée par intelligence artificielle.

La liste définitive, les rôles de chaque prestataire, les lieux de traitement et les éventuels mécanismes de transfert devront être vérifiés avant le lancement commercial.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">6. Durées de conservation</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Les durées précises devront être définies en fonction de chaque catégorie de données et des obligations légales applicables.

Principe retenu : les données ne sont conservées que pendant la durée nécessaire aux finalités décrites, puis supprimées ou archivées lorsque la loi l’exige.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">7. Droits des utilisateurs</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Sous réserve des conditions prévues par la réglementation applicable, les personnes concernées peuvent notamment demander l’accès, la rectification, l’effacement, la limitation ou la portabilité de leurs données, et s’opposer à certains traitements.

Contact pour exercer ces droits : [À COMPLÉTER]

Les utilisateurs peuvent également introduire une réclamation auprès de la CNIL.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">8. Cookies et traceurs</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Les traceurs strictement nécessaires au fonctionnement, à l’authentification ou à la sécurité peuvent être utilisés lorsque la réglementation le permet.

Si SiteAI ajoute des outils d’analyse, de publicité ou d’autres traceurs nécessitant un consentement, un mécanisme de consentement et de retrait devra être mis en place avant leur activation.
            </div>
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
