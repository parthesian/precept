import { FocusPane } from "@/components/focus/FocusPane";
import { ShellFrame } from "@/components/shell/ShellFrame";

export default function FocusPage() {
  return <ShellFrame focus={<FocusPane />} />;
}
