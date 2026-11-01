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
              Lumio est réservé aux personnes âgées d’au moins 18 ans qui l’utilisent pour les besoins de leur activité professionnelle. En créant un compte, l’utilisateur déclare remplir ces conditions ; un compte ouvert par une personne mineure peut être fermé.

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

L’utilisateur est l’éditeur des sites qu’il publie : il renseigne les mentions légales affichées en bas de page (identité, adresse, numéro d’immatriculation, contact) et traite les demandes envoyées par les visiteurs dans le respect de la réglementation sur les données personnelles.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">6. Disponibilité du service</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Lumio met en œuvre les moyens raisonnables pour rendre le service accessible en continu. Il s’agit d’une obligation de moyens : aucun taux de disponibilité n’est garanti.

Le service peut être interrompu pour maintenance, mise à jour, incident technique ou défaillance d’un prestataire (hébergement, authentification, paiement, intelligence artificielle). Lumio s’efforce de prévenir à l’avance des maintenances programmées et de rétablir le service dans les meilleurs délais.

La base de données est sauvegardée chaque jour ; chaque sauvegarde est conservée 14 jours. Il appartient à l’utilisateur de conserver une copie des contenus qu’il juge importants (textes, photos, logos).
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">7. Abonnements et paiement</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              La publication des sites nécessite un abonnement payant. Les prix, le paiement, le renouvellement, la résiliation et le changement de formule sont régis par les Conditions générales de vente (CGV), acceptées lors de la souscription.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">8. Suspension et fermeture de compte</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Fermeture à la demande de l’utilisateur : l’utilisateur peut demander la fermeture de son compte à tout moment en écrivant à support@lumio.business depuis l’adresse e-mail de son compte. Un abonnement en cours doit d’abord être résilié dans les conditions des CGV.

Suspension ou fermeture par Lumio : Lumio peut suspendre l’accès à tout ou partie du service, ou retirer un site, en cas de violation des présentes CGU, de contenu manifestement illicite, de défaut de paiement, d’usage abusif ou d’atteinte à la sécurité du service. Sauf urgence (contenu manifestement illicite, risque pour la sécurité, demande d’une autorité), Lumio prévient l’utilisateur par e-mail en indiquant le motif et lui laisse 8 jours pour régulariser. En cas de manquement grave ou répété, Lumio peut fermer le compte.

Conséquences : à la fermeture du compte, les sites sont retirés du public et les données sont supprimées dans un délai de 3 mois, sauf obligation légale de conservation (notamment comptable). L’utilisateur peut demander une copie de ses contenus avant la fermeture.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">9. Responsabilité</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Lumio est tenu d’une obligation de moyens. L’utilisateur reste seul responsable des contenus publiés sur ses sites, de leur vérification avant publication (y compris les contenus générés par l’intelligence artificielle), de ses mentions légales et de l’usage qu’il fait des demandes reçues de ses visiteurs.

Lumio ne peut être tenu responsable des dommages indirects, notamment perte de chiffre d’affaires, de clientèle, de commandes, d’image ou de chance, ni des conséquences d’informations inexactes publiées par l’utilisateur.

Lorsque la responsabilité de Lumio est engagée, le montant total des dommages et intérêts est limité, toutes causes confondues, aux sommes payées par l’utilisateur à Lumio au cours des 12 mois précédant le fait générateur, et à 100 € pour un utilisateur sans abonnement payant.

Ces limites ne s’appliquent pas en cas de faute lourde ou dolosive de Lumio, de dommage corporel, ni lorsqu’elles videraient de sa substance une obligation essentielle de Lumio.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">10. Propriété intellectuelle</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Lumio reste titulaire de tous les droits sur le service : logiciel, gabarits de sites, styles, illustrations fournies, marque et nom « Lumio ». L’utilisateur bénéficie d’un droit d’utilisation personnel et non exclusif pendant la durée de son compte.

L’utilisateur conserve ses droits sur les contenus qu’il fournit (textes, logos, photos, marques). Il accorde à Lumio, pour la seule durée du service et dans le monde entier, une licence non exclusive et gratuite pour héberger, reproduire et afficher ces contenus, dans la mesure nécessaire au fonctionnement du service.

Les textes générés pour l’utilisateur par l’intelligence artificielle de Lumio peuvent être librement utilisés, modifiés et publiés par l’utilisateur, y compris en dehors de Lumio. Lumio ne garantit pas qu’un texte généré soit unique ou protégeable par le droit d’auteur.

Lumio ne présente un site client comme référence commerciale qu’avec l’accord de son utilisateur.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">11. Signalement des contenus illicites</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Lumio héberge les sites publiés par ses utilisateurs. Toute personne peut signaler un contenu qu’elle estime illicite en écrivant à support@lumio.business, avec l’objet « Signalement », en précisant : l’adresse exacte de la page, la description du contenu, les raisons pour lesquelles il est illicite et ses coordonnées. Cette adresse est aussi le point de contact de Lumio pour les autorités.

Lumio examine chaque signalement avec diligence. Il peut retirer ou rendre inaccessible un contenu manifestement illicite, informer l’utilisateur concerné de la décision et de ses motifs, et lui permettre de la contester par e-mail. Un signalement abusif ou de mauvaise foi peut engager la responsabilité de son auteur. En cas de manquements répétés, Lumio peut fermer le compte concerné.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">12. Modification des CGU</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Lumio peut faire évoluer les présentes CGU pour tenir compte de l’évolution du service ou de la réglementation. En cas de modification substantielle, l’utilisateur est informé par e-mail ou dans son espace au moins 30 jours avant son entrée en vigueur. S’il la refuse, il peut fermer son compte avant cette date ; la poursuite de l’utilisation du service après cette date vaut acceptation.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">13. Droit applicable et litiges</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-400">
              Droit applicable : droit français.
Règlement des litiges : En cas de litige, les parties recherchent d’abord une solution amiable. À défaut, le litige est porté devant les tribunaux compétents ; lorsque l’utilisateur est un professionnel, compétence est attribuée aux tribunaux du ressort de Montpellier.
            </div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">14. Contact</h2>
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
