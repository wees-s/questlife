import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-8">
        <div>
          <div className="w-24 h-24 rounded-full bg-primary-600 mx-auto flex items-center justify-center text-5xl mb-6 animate-pulse">
            ⚔️
          </div>
          <h1 className="font-display text-3xl font-bold text-primary-400">
            Bem-vindo a QuestCity!
          </h1>
          <p className="text-dark-600 mt-3">
            Sua jornada comeca agora, {user?.username || 'Aventureiro'}.
          </p>
        </div>

        <div className="card text-left space-y-4">
          <h3 className="font-semibold text-center">Como funciona</h3>

          <div className="flex items-start gap-3">
            <span className="text-2xl">🏃</span>
            <div>
              <p className="font-medium">Corpo</p>
              <p className="text-sm text-dark-600">Caminhe, corra e explore. Validado por GPS.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-2xl">🧠</span>
            <div>
              <p className="font-medium">Mente</p>
              <p className="text-sm text-dark-600">Medite, estude e foque. Validado por timer.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-2xl">💬</span>
            <div>
              <p className="font-medium">Vinculo Social</p>
              <p className="text-sm text-dark-600">Converse e conecte-se. Validado por chat.</p>
            </div>
          </div>
        </div>

        <div className="card">
          <p className="text-sm text-dark-600">
            Complete quests para ganhar XP, subir de nivel e evoluir seu personagem na QuestCity.
          </p>
        </div>

        <button onClick={() => navigate('/')} className="btn-primary w-full text-lg">
          Comecar minha jornada
        </button>
      </div>
    </div>
  );
}
