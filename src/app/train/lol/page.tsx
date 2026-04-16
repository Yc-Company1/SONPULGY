import LoLTrainer from "@/components/games/LoLTrainer";

export default function LoLTrainerPage() {
  return (
    <div className="max-w-6xl">
      <h2 className="text-2xl font-bold mb-1">LoL 손풀기 트레이너</h2>
      <p className="text-sm text-gray-400 mb-4">협곡 진입 전 카이팅과 닷지를 2분간 점검하세요.</p>
      <LoLTrainer />
    </div>
  );
}
