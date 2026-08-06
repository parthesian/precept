import { ShellFrame } from "../../src/components/shell/ShellFrame";
import { FocusPane } from "../../src/components/focus/FocusPane";

export default function FocusIndex() {
  return <ShellFrame focus={<FocusPane />} />;
}
