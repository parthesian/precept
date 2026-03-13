import { ShotCard } from "./ShotCard";

interface ShotLike {
  id: string;
  title: string;
  year: number;
  tags: string[];
  thumbnail?: string;
  audioVisualRelationship?: string;
}

interface Props {
  readonly shots: readonly ShotLike[];
}

export function ShotGrid({ shots }: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: "0.75rem",
      }}
    >
      {shots.map((shot) => (
        <ShotCard
          key={shot.id}
          title={shot.title}
          year={shot.year}
          tags={shot.tags}
          thumbnail={shot.thumbnail}
          audioVisualRelationship={shot.audioVisualRelationship}
        />
      ))}
    </div>
  );
}
