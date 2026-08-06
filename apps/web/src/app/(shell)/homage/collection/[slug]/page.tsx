import { HomagePane } from "@/components/homage/HomagePane";
import { ShellFrame } from "@/components/shell/ShellFrame";

export default async function HomageCollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ShellFrame homage={<HomagePane centerType="collection" centerSlug={slug} />} />;
}
