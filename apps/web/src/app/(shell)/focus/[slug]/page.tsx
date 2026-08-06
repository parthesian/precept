import { FocusPane } from "@/components/focus/FocusPane";
import { ShellFrame } from "@/components/shell/ShellFrame";

export default async function FocusPreceptPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ShellFrame focus={<FocusPane preceptSlug={slug} />} />;
}
