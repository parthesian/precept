import { ShellFrame } from "@/components/shell/ShellFrame";
import { HomagePane } from "@/components/homage/HomagePane";

export default function HomagePage() {
  return <ShellFrame homage={<HomagePane centerType="film" centerSlug="the-dark-knight" />} />;
}
