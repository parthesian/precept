import { useParams } from "react-router";
import { ShellFrame } from "../../src/components/shell/ShellFrame";
import { FocusPane } from "../../src/components/focus/FocusPane";
import { HomagePane } from "../../src/components/homage/HomagePane";
import { VistaPane } from "../../src/components/vista/VistaPane";

export default function FocusFilm() {
  const { slug = "the-dark-knight" } = useParams();
  return (
    <ShellFrame
      focus={<FocusPane filmSlug={slug} />}
      homage={<HomagePane centerType="film" centerSlug={slug} />}
      vista={<VistaPane filmSlug={slug} />}
    />
  );
}
