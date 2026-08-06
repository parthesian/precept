import { useParams } from "react-router";
import { ShellFrame } from "../../src/components/shell/ShellFrame";
import { HomagePane } from "../../src/components/homage/HomagePane";
import { VistaPane } from "../../src/components/vista/VistaPane";
import { FocusPane } from "../../src/components/focus/FocusPane";

export default function HomageFilm() {
  const { slug = "the-dark-knight" } = useParams();
  return (
    <ShellFrame
      homage={<HomagePane centerType="film" centerSlug={slug} />}
      vista={<VistaPane filmSlug={slug} />}
      focus={<FocusPane filmSlug={slug} />}
    />
  );
}
