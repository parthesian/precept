"use client";

import { FocusPane } from "@/components/focus/FocusPane";
import { HomagePane } from "@/components/homage/HomagePane";
import { ThreePaneShell } from "@/components/shell/ThreePaneShell";
import { VistaPane } from "@/components/vista/VistaPane";

export function ShellFrame({
  vista,
  homage,
  focus,
}: {
  vista?: React.ReactNode;
  homage?: React.ReactNode;
  focus?: React.ReactNode;
}) {
  return (
    <ThreePaneShell
      vista={vista ?? <VistaPane />}
      homage={homage ?? <HomagePane />}
      focus={focus ?? <FocusPane />}
    />
  );
}
