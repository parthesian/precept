import { VistaPane } from "@/components/vista/VistaPane";
import { ShellFrame } from "@/components/shell/ShellFrame";

export default async function VistaPlacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ShellFrame vista={<VistaPane placeSlug={slug} />} />;
}
