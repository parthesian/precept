import { ShellFrame } from "../../src/components/shell/ShellFrame";
import { VistaPane } from "../../src/components/vista/VistaPane";

export default function VistaIndex() {
  return <ShellFrame vista={<VistaPane />} />;
}
