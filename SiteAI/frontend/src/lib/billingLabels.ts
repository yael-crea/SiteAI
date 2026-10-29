// Libellés de la formule et du statut d'abonnement, partagés par les pages de l'espace client.

export function readablePlan(plan: string) {
  switch (plan.toLowerCase()) {
    case "essentiel":
      return "Essentiel";
    case "pro":
      return "Pro";
    case "agence":
      return "Agence";
    default:
      return "Aucun abonnement";
  }
}

export function readableBillingStatus(status: string) {
  switch (status) {
    case "active":
      return "Actif";
    case "trialing":
      return "Période d’essai";
    case "past_due":
      return "Paiement en retard";
    case "unpaid":
      return "Impayé";
    case "canceled":
      return "Résilié";
    case "incomplete":
      return "Paiement incomplet";
    case "incomplete_expired":
      return "Expiré";
    default:
      return status || "Inactif";
  }
}
