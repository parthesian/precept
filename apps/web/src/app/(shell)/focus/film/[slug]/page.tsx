import { HomagePane } from "@/components/homage/HomagePane";
import { FocusPane } from "@/components/focus/FocusPane";
import { VistaPane } from "@/components/vista/VistaPane";
import { ShellFrame } from "@/components/shell/ShellFrame";

export default async function FocusFilmPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <ShellFrame
      focus={<FocusPane filmSlug={slug} />}
      homage={<HomagePane centerType="film" centerSlug={slug} />}
      vista={<VistaPane filmSlug={slug} />}
    />
  );
}
