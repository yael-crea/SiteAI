# CGU et CGV de Lumio : clauses à valider

Document préparé pour la relecture juridique des conditions de Lumio
(lumio.business). Les textes complets sont en ligne sur `/cgu` et `/cgv`
(sources : `SiteAI/frontend/src/app/cgu/page.tsx`, `cgv/page.tsx`,
`src/lib/commercialPlans.ts`). Ils portent encore la bannière « Version
provisoire », à retirer après validation.

## Contexte utile

- Éditeur : Yael Castan Gleizes EI, micro-entreprise, SIREN 131 781 932,
  TVA non applicable (art. 293 B du CGI).
- Service : création de sites vitrines par IA, hébergement des sites des
  clients, formulaires de contact et devis, abonnements mensuels Stripe
  (Essentiel 19,90 €, Pro 39,90 €, Agence 79,90 €).
- Clientèle : **professionnels uniquement** (déclaration cochée et
  enregistrée à la souscription), personnes majeures.
- Lumio est **hébergeur** des sites de ses clients et **sous-traitant RGPD**
  pour les données de leurs visiteurs (accord art. 28 dans l'article 17 des
  CGV).

## Clauses rédigées (avant : textes provisoires)

| Document | Article | Contenu proposé | Point à valider |
|---|---|---|---|
| CGU | 6. Disponibilité | Obligation de moyens, pas de taux garanti, maintenances annoncées si possible, sauvegarde quotidienne gardée 14 jours | Suffisant sans SLA ? |
| CGU | 7. Abonnements | Renvoi aux CGV | — |
| CGU | 8. Suspension et fermeture | Fermeture à la demande par e-mail ; suspension par Lumio avec préavis de 8 jours sauf urgence ; suppression des données sous 3 mois | Durée du préavis ; motifs |
| CGU | 9. Responsabilité | Obligation de moyens ; exclusion des dommages indirects ; plafond = sommes payées sur 12 mois (100 € sans abonnement) ; exceptions faute lourde/dolosive, dommage corporel, obligation essentielle | **Montant du plafond** ; validité face à la jurisprudence Chronopost / Faurecia |
| CGU | 10. Propriété intellectuelle | Droits de Lumio sur le logiciel et les gabarits ; licence d'hébergement donnée par le client pour la durée du service ; libre usage des textes générés par l'IA, sans garantie d'unicité ni de protection | Formulation sur les textes générés par IA |
| CGU | 11. Signalement des contenus illicites | Signalement à support@lumio.business (objet « Signalement ») ; examen diligent ; retrait d'un contenu manifestement illicite ; information motivée du client et possibilité de contester ; point de contact des autorités | Conformité LCEN art. 6 et règlement (UE) 2022/2065 (DSA) art. 11, 12, 16, 17 pour une micro-entreprise |
| CGU | 12. Modification des CGU | Information 30 jours avant ; refus = fermeture du compte ; usage continu = acceptation | — |
| CGV | 4. Prix | Hausse annoncée 30 jours avant, applicable au renouvellement suivant ; résiliation possible | — |
| CGV | 6. Formation du contrat | Cases d'acceptation des CGV et de déclaration professionnelle, version et date enregistrées (déjà en place dans l'outil) | — |
| CGV | 9. Résiliation et changement de formule | Pas de remboursement au prorata ; changement de formule calculé par Stripe ; formule inférieure : sites en trop remis en brouillon | — |
| CGV | 10. Retard de paiement | Taux BCE + 10 points, indemnité forfaitaire de 40 € | — |
| CGV | 11. Disponibilité | Identique à CGU 6 | — |
| CGV | 15. Suspension | Préavis de 8 jours sauf urgence ; échec de paiement géré par Stripe | — |
| CGV | 18. Responsabilité | Identique à CGU 9 (plafond 12 mois) | **Montant du plafond** |
| CGV | 20. Modification | Information 30 jours avant, application au renouvellement suivant, résiliation possible | — |

## Autres corrections faites

- Contact légal et données personnelles : `support@lumio.business` au lieu
  d'une adresse Gmail personnelle (CGV art. 1, confidentialité, mentions
  légales).
- Mentions légales de Lumio : adresse de signalement des contenus illicites.
- Sites des clients : bloc « Mentions légales et données personnelles » en
  bas de page avec l'identité de l'éditeur, l'hébergeur, l'usage des données
  du formulaire, la mesure d'audience et un lien de signalement.
- Versions : CGV `2026-11-02`, CGU `2026-11-02`. Les nouvelles
  acceptations sont enregistrées avec ces versions.

## Questions ouvertes pour le juriste

1. Le plafond de responsabilité (12 mois de facturation, 100 € sans
   abonnement) est-il adapté et opposable à un client professionnel ?
2. Les obligations du DSA applicables à une micro-entreprise hébergeuse
   sont-elles couvertes par l'article 11 des CGU ?
3. L'ajout de Sentry (suivi d'erreurs) comme sous-traitant ultérieur : la
   politique de confidentialité est à jour ; faut-il une information
   individuelle des clients existants (article 17 des CGV) ?
4. Faut-il une procédure de suppression de compte en libre-service (bouton)
   plutôt que par e-mail ?
5. Une fois validées : retirer les bannières « Version provisoire » et
   l'introduction « base provisoire » des CGU.

## Vérification interne du 2 novembre 2026

Relecture faite sans avocat, à partir des textes et de sources secondaires
(EUR-Lex et Légifrance n'étaient pas lisibles automatiquement ce jour-là).
Les bannières « Version provisoire » ont été retirées à la demande de
l'éditeur, qui en assume la décision. Versions : CGV `2026-11-02`,
CGU `2026-11-02`.

Corrections apportées :

- CGU art. 11 (règlement (UE) 2022/2065, art. 11, 12, 16, 17 et 18) :
  point de contact unique pour les utilisateurs et les autorités, langues
  (français, anglais), accusé de réception, information de l'auteur du
  signalement, examen humain sans modération automatisée, exposé des motifs
  avec fondement et voies de recours, information des autorités en cas de
  soupçon d'infraction menaçant la vie ou la sécurité.
- Clause attributive de compétence (CGU art. 13, CGV art. 21) : limitée aux
  clients commerçants et mise en évidence en capitales, l'article 48 du Code
  de procédure civile la réputant non écrite à l'égard des non-commerçants
  (artisans, professions libérales, associations).
- Confidentialité (RGPD art. 13.2.e ; loi Informatique et Libertés,
  art. 85) : caractère obligatoire ou facultatif des données, directives
  après décès.

Restent à vérifier par un professionnel :

1. Numéro de téléphone de Vercel Inc. à ajouter aux mentions légales de
   Lumio et des sites clients (LCEN, art. 1-1) : aucun numéro officiel
   vérifié n'a été trouvé.
2. Plafond de responsabilité (question 1 ci-dessus).
3. Information des clients existants sur Sentry (question 3).
