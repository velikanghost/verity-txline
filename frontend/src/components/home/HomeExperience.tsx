import { WorldCupHero } from "./WorldCupHero";

export default function HomeExperience() {
  return (
    <div className="tournament-home flex min-h-[calc(100vh-150px)] flex-col justify-center pb-10 pt-2">
      <WorldCupHero />
    </div>
  );
}
