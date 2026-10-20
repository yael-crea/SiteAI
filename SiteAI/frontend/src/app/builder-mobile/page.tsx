import { redirect } from "next/navigation";

type LegacyBuilderMobilePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LegacyBuilderMobilePage({
  searchParams,
}: LegacyBuilderMobilePageProps) {
  const values = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
    } else if (value) {
      query.set(key, value);
    }
  }

  redirect(query.size > 0 ? `/builder?${query.toString()}` : "/builder");
}

