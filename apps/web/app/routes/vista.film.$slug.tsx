import { useParams } from "react-router";
import { ShellFrame } from "../../src/components/shell/ShellFrame";
import { VistaPane } from "../../src/components/vista/VistaPane";
import { HomagePane } from "../../src/components/homage/HomagePane";
import { FocusPane } from "../../src/components/focus/FocusPane";

export default function VistaFilm() {
  const { slug = "the-dark-knight" } = useParams();
  return (
    <ShellFrame
      vista={<VistaPane filmSlug={slug} />}
      homage={<HomagePane centerType="film" centerSlug={slug} />}
      focus={<FocusPane filmSlug={slug} />}
    />
  );
}
