import { Link } from 'react-router-dom';

const PILLAR_CONFIG: Record<string, { class: string; label: string; icon: string }> = {
  corpo: { class: 'quest-card-corpo', label: 'Corpo', icon: '🏃' },
  mente: { class: 'quest-card-mente', label: 'Mente', icon: '🧠' },
  social: { class: 'quest-card-social', label: 'Social', icon: '💬' },
};

const VALIDATION_LABELS: Record<string, string> = {
  gps: 'GPS',
  timer: 'Timer',
  chat: 'Chat',
  manual: 'Manual',
};

interface Quest {
  id: string;
  title: string;
  description: string;
  pillar: string;
  type: string;
  validationType: string;
  xpRewards: Record<string, number>;
  narrativeFlavor?: string;
}

export default function QuestCard({ quest }: { quest: Quest }) {
  const pillar = PILLAR_CONFIG[quest.pillar] || PILLAR_CONFIG.corpo;
  const totalXp = quest.xpRewards?.total || 0;

  return (
    <Link to={`/quest/${quest.id}`} className={`card ${pillar.class} block hover:bg-dark-700 transition-colors`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span>{pillar.icon}</span>
            <span className="text-xs font-medium text-dark-600 uppercase">{pillar.label}</span>
            <span className="text-xs text-dark-600">·</span>
            <span className="text-xs text-dark-600">{VALIDATION_LABELS[quest.validationType]}</span>
          </div>
          <h4 className="font-semibold">{quest.title}</h4>
          <p className="text-sm text-dark-600 mt-1 line-clamp-2">{quest.description}</p>
          {quest.narrativeFlavor && (
            <p className="text-xs text-primary-400/70 italic mt-2">{quest.narrativeFlavor}</p>
          )}
        </div>
        <div className="text-right ml-3">
          <span className="text-lg font-bold text-primary-400">+{totalXp}</span>
          <p className="text-xs text-dark-600">XP</p>
        </div>
      </div>
    </Link>
  );
}
