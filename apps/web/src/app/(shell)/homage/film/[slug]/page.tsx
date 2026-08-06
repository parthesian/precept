import { HomagePane } from "@/components/homage/HomagePane";
import { FocusPane } from "@/components/focus/FocusPane";
import { VistaPane } from "@/components/vista/VistaPane";
import { ShellFrame } from "@/components/shell/ShellFrame";

export default async function HomageFilmPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <ShellFrame
      homage={<HomagePane centerType="film" centerSlug={slug} />}
      vista={<VistaPane filmSlug={slug} />}
      focus={<FocusPane filmSlug={slug} />}
    />
  );
}
