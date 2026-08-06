import { useParams } from "react-router";
import { ShellFrame } from "../../src/components/shell/ShellFrame";
import { VistaPane } from "../../src/components/vista/VistaPane";

export default function VistaPlace() {
  const { slug = "" } = useParams();
  return <ShellFrame vista={<VistaPane placeSlug={slug} />} />;
}
