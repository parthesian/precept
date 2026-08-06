import { HomagePane } from "@/components/homage/HomagePane";
import { FocusPane } from "@/components/focus/FocusPane";
import { VistaPane } from "@/components/vista/VistaPane";
import { ShellFrame } from "@/components/shell/ShellFrame";

export default async function VistaFilmPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <ShellFrame
      vista={<VistaPane filmSlug={slug} />}
      homage={<HomagePane centerType="film" centerSlug={slug} />}
      focus={<FocusPane filmSlug={slug} />}
    />
  );
}
