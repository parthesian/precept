import { ShotCard } from "./ShotCard";

interface ShotLike {
  id: string;
  title: string;
  year: number;
  tags: string[];
  thumbnail?: string;
  timecodeStart?: number;
  shotScale?: string;
  audioVisualRelationship?: string;
}

interface Props {
  readonly shots: readonly ShotLike[];
  readonly onSelect?: (shotId: string) => void;
}

export function ShotGrid({ shots, onSelect }: Props) {
  return (
    <div className="contact-sheet">
      {shots.map((shot) => (
        <ShotCard
          key={shot.id}
          id={shot.id}
          title={shot.title}
          year={shot.year}
          tags={shot.tags}
          thumbnail={shot.thumbnail}
          timecodeStart={shot.timecodeStart}
          shotScale={shot.shotScale}
          audioVisualRelationship={shot.audioVisualRelationship}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
