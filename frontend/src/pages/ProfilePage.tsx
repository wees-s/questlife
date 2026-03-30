import { useMe } from '../api/hooks';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { xpForNextLevel } from '../utils/progression';

export default function ProfilePage() {
  const { data: user, isLoading } = useMe();
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  if (isLoading) return <div className="text-center text-dark-600 py-20">Carregando...</div>;
  if (!user) return null;

  const attrs = user.attributes || {};
  const level = attrs.level || 1;
  const totalXp = attrs.totalXp || 0;
  const nextLevelXp = xpForNextLevel(level);
  const progress = Math.min(100, (totalXp / nextLevelXp) * 100);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Avatar + Info */}
      <div className="card text-center">
        <div className="w-20 h-20 rounded-full bg-primary-600 mx-auto flex items-center justify-center text-3xl mb-3">
          {user.username?.[0]?.toUpperCase() || '?'}
        </div>
        <h2 className="font-display text-xl font-bold">{user.username}</h2>
        <p className="text-sm text-dark-600 capitalize">{user.class}</p>
        <p className="text-xs text-dark-600 mt-1">{user.email}</p>
      </div>

      {/* Level Progress */}
      <div className="card">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold">Level {level}</span>
          <span className="text-sm text-dark-600">{totalXp} / {nextLevelXp} XP</span>
        </div>
        <div className="w-full bg-dark-700 rounded-full h-3">
          <div
            className="bg-primary-500 rounded-full h-3 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Full Attributes */}
      <div className="card">
        <h3 className="font-semibold mb-3">Atributos</h3>
        <div className="space-y-3">
          <AttributeRow label="Vitalidade" value={attrs.vitalidade || 0} color="bg-red-400" />
          <AttributeRow label="Carisma" value={attrs.carisma || 0} color="bg-green-400" />
          <AttributeRow label="Inteligencia" value={attrs.inteligencia || 0} color="bg-blue-400" />
          <AttributeRow label="Disciplina" value={attrs.disciplina || 0} color="bg-yellow-400" />
          <AttributeRow label="Criatividade" value={attrs.criatividade || 0} color="bg-purple-400" />
          <AttributeRow label="Coragem" value={attrs.coragem || 0} color="bg-orange-400" />
        </div>
      </div>

      {/* Logout */}
      <button onClick={handleLogout} className="btn-secondary w-full">
        Sair
      </button>
    </div>
  );
}

function AttributeRow({ label, value, color }: { label: string; value: number; color: string }) {
  const maxWidth = Math.min(100, value * 2);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="w-full bg-dark-700 rounded-full h-2">
        <div className={`${color} rounded-full h-2 transition-all duration-500`} style={{ width: `${maxWidth}%` }} />
      </div>
    </div>
  );
}
