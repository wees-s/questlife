import { useQuests, useMe } from '../api/hooks';
import QuestCard from '../components/QuestCard';

export default function DashboardPage() {
  const { data: user } = useMe();
  const { data: quests, isLoading } = useQuests();

  const dailyQuests = quests?.filter((q: any) => q.type === 'daily') || [];
  const weeklyQuests = quests?.filter((q: any) => q.type === 'weekly') || [];

  return (
    <div className="space-y-6">
      {/* Header greeting */}
      <div>
        <h2 className="font-display text-2xl font-bold">
          Ola, {user?.username || 'Aventureiro'}!
        </h2>
        <p className="text-dark-600 text-sm mt-1">
          Level {user?.attributes?.level || 1} — {user?.attributes?.totalXp || 0} XP total
        </p>
      </div>

      {/* Attributes bar */}
      {user?.attributes && (
        <div className="card">
          <h3 className="text-sm font-semibold text-dark-600 mb-3">Seus Atributos</h3>
          <div className="grid grid-cols-3 gap-3">
            <AttributeBar label="VIT" value={user.attributes.vitalidade} color="text-red-400" />
            <AttributeBar label="CAR" value={user.attributes.carisma} color="text-green-400" />
            <AttributeBar label="INT" value={user.attributes.inteligencia} color="text-blue-400" />
            <AttributeBar label="DIS" value={user.attributes.disciplina} color="text-yellow-400" />
            <AttributeBar label="CRI" value={user.attributes.criatividade} color="text-purple-400" />
            <AttributeBar label="COR" value={user.attributes.coragem} color="text-orange-400" />
          </div>
        </div>
      )}

      {/* Quest sections */}
      {isLoading ? (
        <div className="text-center text-dark-600 py-10">Carregando quests...</div>
      ) : (
        <>
          <QuestSection title="Quests Diarias" quests={dailyQuests} />
          <QuestSection title="Quests Semanais" quests={weeklyQuests} />
        </>
      )}
    </div>
  );
}

function AttributeBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-xs font-bold ${color}`}>{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function QuestSection({ title, quests }: { title: string; quests: any[] }) {
  if (quests.length === 0) return null;
  return (
    <div>
      <h3 className="font-display text-lg font-semibold mb-3">{title}</h3>
      <div className="space-y-3">
        {quests.map((quest: any) => (
          <QuestCard key={quest.id} quest={quest} />
        ))}
      </div>
    </div>
  );
}
