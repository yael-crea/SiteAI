import type { SiteLegal } from "@/lib/builderTypes";
import { LUMIO_HOST_NOTICE } from "@/lib/siteLegal";

type LegalSite = { businessName: string; phone?: string; legal?: SiteLegal };

/*
 * Mentions légales et information sur les données personnelles, en bas de
 * chaque site client (gabarits classiques et signature).
 *
 * Un site professionnel doit indiquer qui l'édite et qui l'héberge (loi pour
 * la confiance dans l'économie numérique, art. 6) et informer les visiteurs
 * de l'usage des données envoyées par le formulaire (RGPD, art. 13). Les
 * informations de l'entreprise viennent de l'éditeur (« Mentions légales ») ;
 * une ligne non renseignée n'est pas affichée.
 */

export default function SiteLegalNotice({ site }: { site: LegalSite }) {
  const legal = site.legal ?? {};
  const name = legal.companyName?.trim() || site.businessName;
  const email = legal.email?.trim();
  const lines: [string, string | undefined][] = [
    ["Éditeur", [name, legal.legalForm?.trim()].filter(Boolean).join(", ")],
    ["Adresse", legal.address?.trim()],
    ["SIREN / SIRET", legal.siren?.trim()],
    ["TVA intracommunautaire", legal.vatNumber?.trim()],
    ["Directeur de la publication", legal.publisher?.trim() || name],
    ["Contact", [email, site.phone?.trim()].filter(Boolean).join(" · ") || undefined],
  ];

  return (
    <details data-siteai-legal className="mt-6 text-left text-xs leading-6 opacity-80">
      <summary className="cursor-pointer font-semibold">Mentions légales et données personnelles</summary>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="font-semibold">Mentions légales</p>
          <ul className="mt-1 space-y-0.5">
            {lines
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <li key={label}>
                  {label} : {value}
                </li>
              ))}
          </ul>
          <p className="mt-2">{LUMIO_HOST_NOTICE}</p>
          <p className="mt-2">
            Signaler un contenu illicite :{" "}
            <a href="mailto:support@lumio.business?subject=Signalement" className="underline">
              support@lumio.business
            </a>
          </p>
        </div>
        <div>
          <p className="font-semibold">Données personnelles</p>
          <p className="mt-1">
            Les informations envoyées par le formulaire de contact sont utilisées par {name} uniquement pour
            répondre à votre demande et, le cas échéant, vous adresser un devis. Elles ne sont ni vendues ni
            cédées et sont conservées au plus trois ans après le dernier échange.
          </p>
          <p className="mt-2">
            Vous pouvez demander l’accès, la rectification ou la suppression de vos données
            {email ? ` en écrivant à ${email}` : " par le formulaire de contact"}, et adresser une réclamation à la
            CNIL (cnil.fr).
          </p>
          <p className="mt-2">
            Ce site mesure sa fréquentation sans cookie publicitaire : un identifiant aléatoire est gardé dans votre
            navigateur 13 mois au plus et les statistiques 25 mois au plus, uniquement pour {name}.
          </p>
        </div>
      </div>
    </details>
  );
}
