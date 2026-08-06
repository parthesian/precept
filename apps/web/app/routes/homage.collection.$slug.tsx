import { useParams } from "react-router";
import { ShellFrame } from "../../src/components/shell/ShellFrame";
import { HomagePane } from "../../src/components/homage/HomagePane";

export default function HomageCollection() {
  const { slug = "" } = useParams();
  return <ShellFrame homage={<HomagePane centerType="collection" centerSlug={slug} />} />;
}
