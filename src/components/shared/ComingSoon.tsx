export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      <div className="card text-center py-16">
        <div className="text-4xl mb-4">🚧</div>
        <p className="text-lg font-semibold">Coming Soon</p>
        <p className="text-sm text-gray-400 mt-2">
          다음 업데이트에서 만나요. 현재는 Aim Trainer만 플레이 가능합니다.
        </p>
      </div>
    </div>
  );
}
