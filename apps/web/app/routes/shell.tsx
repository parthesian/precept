import { Outlet } from "react-router";

/** Layout marker for shell routes — each child renders its own ShellFrame. */
export default function ShellLayout() {
  return <Outlet />;
}
