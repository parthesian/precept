import { VistaPane } from "@/components/vista/VistaPane";
import { ShellFrame } from "@/components/shell/ShellFrame";

export default function VistaPage() {
  return <ShellFrame vista={<VistaPane />} />;
}
