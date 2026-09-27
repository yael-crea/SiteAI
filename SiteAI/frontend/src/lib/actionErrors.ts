export function actionError(error: unknown, fallback: string): string {
 if (error instanceof TypeError || (error instanceof Error && /failed to fetch|networkerror|load failed/i.test(error.message))) {
  return "La connexion au serveur a été interrompue. Vérifie ta connexion, puis réessaie. Tes modifications restent dans cet éditeur.";
 }
 if (error instanceof Error && error.message && !/<(?:html|body|!doctype)/i.test(error.message)) return error.message.slice(0,600);
 return fallback;
}

export function notificationLabel(status?: string) {
 switch(status) {
  case "sent": return "Email accepté par le service d’envoi. Si tu ne le vois pas, vérifie les courriers indésirables. La réception en boîte n’est pas confirmée.";
  case "pending": return "Email en cours d’envoi ou résultat encore inconnu. Actualise dans quelques instants ; la demande est déjà enregistrée ici.";
  case "failed": return "L’email de notification n’a pas pu être confirmé. La demande est conservée ici : contacte le prospect depuis cette fiche. Le propriétaire du service doit vérifier la configuration d’envoi.";
  case "unconfigured": return "Notification email non configurée. La demande est conservée ici. Le propriétaire du service doit vérifier l’adresse destinataire et la configuration Resend.";
  default: return "La demande est enregistrée. Le statut de l’email n’est pas disponible pour cette demande.";
 }
}
