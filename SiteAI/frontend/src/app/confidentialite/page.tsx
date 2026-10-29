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
          <h1 className="mt-4 text-4xl font-black md:text-5xl">Politique de confidentialité</h1>
          <p className="mt-5 max-w-3xl leading-7 text-slate-400">
            Cette politique décrit les données personnelles traitées par Lumio, les raisons de ces traitements, les prestataires qui y participent et les droits des personnes concernées.
          </p>

          <div className="mt-6 rounded-2xl border border-amber-800 bg-amber-950/30 p-5 text-sm leading-7 text-amber-200">
            ⚠️ Version provisoire : cette politique devra être relue avant
            la commercialisation de Lumio.
          </div>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">1. Responsable du traitement</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Responsable du traitement : Yael Castan Gleizes EI (SIREN 131 781 932)
Adresse : 3 rue de l’Opale, 34070 Montpellier, France
E-mail relatif aux données personnelles : castanyael@gmail.com

Lumio est responsable du traitement des données de ses propres clients et utilisateurs (compte, sites, abonnement, support).

Pour les données des visiteurs des sites publiés avec Lumio (demandes de devis, statistiques de visite), le responsable du traitement est le propriétaire du site. Lumio agit alors en tant que sous-traitant, pour son compte et selon ses instructions, dans les conditions prévues par les CGV.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">2. Données susceptibles d’être traitées</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Selon l’utilisation de Lumio, les données peuvent notamment inclure :
• adresse e-mail et informations de compte ;
• informations fournies lors de la création d’un site ;
• contenus, textes, images, logos et domaines ajoutés par l’utilisateur ;
• informations liées à l’abonnement et au statut de paiement ;
• demandes de devis envoyées depuis les sites publiés : nom, coordonnées, type de besoin et message ;
• identifiant aléatoire conservé dans le navigateur, pages vues et clics sur les moyens de contact ;
• journaux techniques nécessaires à la sécurité, au diagnostic et au fonctionnement du service.

Les données de carte bancaire ne sont pas destinées à être stockées directement par Lumio lorsque le paiement est traité par Stripe.
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
• transmettre et organiser les demandes de devis pour le propriétaire du site ;
• fournir au propriétaire des statistiques agrégées sur les visites et les intentions de contact ;
• assurer la sécurité et le bon fonctionnement du service ;
• répondre aux demandes de support ;
• respecter les obligations légales applicables.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">4. Bases juridiques</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Chaque traitement repose sur l’une des bases suivantes :
• l’exécution du contrat : création et gestion du compte, génération et publication des sites, abonnement, paiement, support ;
• le respect d’une obligation légale : facturation, comptabilité, conservation des preuves de paiement ;
• l’intérêt légitime de Lumio : sécurité du service, prévention des abus, journaux techniques, preuve de l’acceptation des CGV, mesure d’audience des sites publiés dans les conditions décrites à la section 8.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">5. Prestataires et transferts de données</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Lumio fait appel aux prestataires suivants, qui traitent les données uniquement pour fournir leur service :
• Supabase Pte. Ltd. : base de données, authentification et stockage des images. Les données sont hébergées dans l’Union européenne (Francfort, Allemagne) ;
• Stripe Payments Europe, Ltd. (Irlande) : paiements et abonnements. Les données de carte bancaire sont traitées directement par Stripe et ne sont jamais stockées par Lumio ;
• Vercel Inc. (États-Unis) : hébergement du site Lumio et des sites publiés ;
• Railway Corporation (États-Unis) : hébergement du serveur applicatif ;
• OpenAI (États-Unis) : génération et modification des textes par intelligence artificielle. Seules les informations saisies pour générer ou modifier un site lui sont transmises ; elles ne sont pas utilisées pour entraîner ses modèles ;
• Resend, Inc. (États-Unis) : envoi des e-mails du service, notamment les notifications de demandes de devis ;
• Google : uniquement si l’utilisateur choisit de se connecter avec son compte Google.

Lorsque des données sont transférées hors de l’Union européenne, ces transferts sont encadrés par les garanties prévues par le RGPD : décision d’adéquation de la Commission européenne (Data Privacy Framework UE–États-Unis) pour les prestataires certifiés, ou clauses contractuelles types de la Commission européenne.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">6. Durées de conservation</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              • Compte, sites et contenus : pendant toute la durée d’utilisation du compte, puis suppression dans un délai de 3 mois après la clôture du compte ou la demande de suppression ;
• demandes de devis reçues sur les sites publiés : tant que le propriétaire du site les conserve dans son espace, et au plus tard jusqu’à la suppression de son compte ;
• statistiques de visite des sites publiés : 25 mois au maximum, puis suppression automatique ;
• factures et données de paiement nécessaires à la comptabilité : 10 ans, conformément au Code de commerce ;
• preuves d’acceptation des CGV et déclarations faites lors de la souscription : pendant la durée de l’abonnement, puis 5 ans ;
• journaux techniques : quelques semaines, selon les durées appliquées par les hébergeurs, et au maximum 12 mois ;
• sauvegardes chiffrées de la base de données : 14 jours.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">7. Droits des personnes concernées</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Toute personne concernée peut demander l’accès à ses données, leur rectification, leur effacement, la limitation du traitement ou leur portabilité, et s’opposer aux traitements fondés sur l’intérêt légitime.

Pour exercer ces droits, il suffit d’écrire à castanyael@gmail.com. Une réponse est apportée dans un délai d’un mois. Un justificatif d’identité peut être demandé en cas de doute raisonnable sur l’identité du demandeur.

Les visiteurs d’un site publié avec Lumio s’adressent en priorité au propriétaire de ce site ; Lumio l’aide à répondre à leur demande.

Toute personne peut aussi introduire une réclamation auprès de la CNIL : 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 — www.cnil.fr.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">8. Cookies et traceurs</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Le site Lumio n’utilise aucun cookie publicitaire ni aucun traceur de réseau social.

Sur le site Lumio, seuls des éléments strictement nécessaires sont enregistrés dans le navigateur : la session de connexion (Supabase), le brouillon du site en cours de création et quelques préférences de navigation. Ils ne nécessitent pas de consentement.

Sur les sites publiés, Lumio mesure l’audience pour le compte du propriétaire du site : un identifiant aléatoire propre à chaque site est enregistré dans le stockage local du navigateur pour compter les visiteurs uniques. Cette mesure respecte les conditions de dispense de consentement fixées par la CNIL :
• elle sert uniquement à produire des statistiques de fréquentation pour le propriétaire du site ;
• les données ne sont ni croisées avec d’autres traitements, ni transmises à des tiers, ni utilisées pour la publicité ;
• l’identifiant est remplacé par un nouveau au bout de 13 mois ;
• les données de visite sont supprimées au bout de 25 mois.

Si Lumio ajoute un jour des traceurs soumis au consentement, un bandeau permettant de les accepter ou de les refuser sera mis en place avant leur activation.
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
