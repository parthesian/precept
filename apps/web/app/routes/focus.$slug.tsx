import { useParams } from "react-router";
import { ShellFrame } from "../../src/components/shell/ShellFrame";
import { FocusPane } from "../../src/components/focus/FocusPane";

export default function FocusSlug() {
  const { slug = "" } = useParams();
  return <ShellFrame focus={<FocusPane preceptSlug={slug} />} />;
}
