import CreationFlow from "@/components/creation/CreationFlow";

/** Premier site : même parcours que /creer, avec retour au tableau de bord si des sites existent déjà. */
export default function OnboardingPage() {
  return <CreationFlow firstSite />;
}
