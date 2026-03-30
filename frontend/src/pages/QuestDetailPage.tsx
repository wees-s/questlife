import { useParams, useNavigate } from 'react-router-dom';
import { useQuest, useStartQuest } from '../api/hooks';

const PILLAR_COLORS: Record<string, string> = {
  corpo: 'text-quest-corpo',
  mente: 'text-quest-mente',
  social: 'text-quest-social',
};

export default function QuestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: quest, isLoading } = useQuest(id || '');
  const startQuest = useStartQuest();

  if (isLoading) {
    return <div className="text-center text-dark-600 py-20">Carregando...</div>;
  }

  if (!quest) {
    return <div className="text-center text-dark-600 py-20">Quest nao encontrada</div>;
  }

  const rewards = quest.xpRewards || {};
  const reqs = quest.requirements || {};

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="text-dark-600 hover:text-white text-sm">
        ← Voltar
      </button>

      <div className="card">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-sm font-bold uppercase ${PILLAR_COLORS[quest.pillar]}`}>
            {quest.pillar}
          </span>
          <span className="text-xs text-dark-600 bg-dark-700 px-2 py-0.5 rounded">
            {quest.type}
          </span>
        </div>

        <h2 className="font-display text-2xl font-bold">{quest.title}</h2>
        <p className="text-dark-600 mt-2">{quest.description}</p>

        {quest.narrativeFlavor && (
          <blockquote className="border-l-2 border-primary-500 pl-3 mt-4 text-sm text-primary-400/80 italic">
            {quest.narrativeFlavor}
          </blockquote>
        )}
      </div>

      {/* Requirements */}
      <div className="card">
        <h3 className="text-sm font-semibold text-dark-600 mb-3">Requisitos</h3>
        <ul className="space-y-2 text-sm">
          {reqs.distance_meters && (
            <li className="flex items-center gap-2">
              <span className="text-quest-corpo">📍</span>
              Distancia: {(reqs.distance_meters / 1000).toFixed(1)}km
            </li>
          )}
          {reqs.duration_seconds && (
            <li className="flex items-center gap-2">
              <span className="text-quest-mente">⏱</span>
              Duracao: {Math.round(reqs.duration_seconds / 60)} minutos
            </li>
          )}
          {reqs.min_messages && (
            <li className="flex items-center gap-2">
              <span className="text-quest-social">💬</span>
              Minimo de {reqs.min_messages} mensagens
            </li>
          )}
          {reqs.min_duration_seconds && (
            <li className="flex items-center gap-2">
              <span className="text-quest-social">⏱</span>
              Tempo minimo: {Math.round(reqs.min_duration_seconds / 60)} minutos
            </li>
          )}
        </ul>
      </div>

      {/* Rewards */}
      <div className="card">
        <h3 className="text-sm font-semibold text-dark-600 mb-3">Recompensas</h3>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(rewards)
            .filter(([key]) => key !== 'total')
            .filter(([, val]) => (val as number) > 0)
            .map(([key, val]) => (
              <div key={key} className="text-center bg-dark-700 rounded-lg p-2">
                <p className="text-xs text-dark-600 capitalize">{key}</p>
                <p className="font-bold text-primary-400">+{val as number}</p>
              </div>
            ))}
        </div>
        <div className="text-center mt-3">
          <span className="text-2xl font-bold text-primary-400">+{rewards.total || 0}</span>
          <span className="text-dark-600 ml-1">XP Total</span>
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={() => startQuest.mutate(quest.id, { onSuccess: () => navigate('/') })}
        className="btn-primary w-full text-lg"
        disabled={startQuest.isPending}
      >
        {startQuest.isPending ? 'Iniciando...' : 'Iniciar Quest'}
      </button>

      {startQuest.error && (
        <p className="text-red-400 text-sm text-center">{startQuest.error.message}</p>
      )}
    </div>
  );
}
