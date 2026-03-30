import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRegister } from '../api/hooks';

const CLASSES = [
  { id: 'explorador', name: 'Explorador', desc: 'Descubra novos lugares e caminhos', emoji: '🧭' },
  { id: 'academico', name: 'Academico', desc: 'Foco em aprendizado e conhecimento', emoji: '📚' },
  { id: 'atleta', name: 'Atleta', desc: 'Supere seus limites fisicos', emoji: '💪' },
  { id: 'social', name: 'Social', desc: 'Conecte-se com outras pessoas', emoji: '🤝' },
  { id: 'criador', name: 'Criador', desc: 'Crie e inove no mundo real', emoji: '🎨' },
];

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedClass, setSelectedClass] = useState('explorador');
  const navigate = useNavigate();
  const register = useRegister();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register.mutate(
      { username, email, password, class: selectedClass },
      { onSuccess: () => navigate('/onboarding') },
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-primary-400 mb-2">LifeQuest</h1>
          <p className="text-dark-600">Crie seu personagem</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="text-xl font-semibold text-center">Criar Conta</h2>

          <div>
            <label className="block text-sm text-dark-600 mb-1">Nome de usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              placeholder="aventureiro123"
              required
              minLength={3}
              maxLength={30}
            />
          </div>

          <div>
            <label className="block text-sm text-dark-600 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-dark-600 mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-sm text-dark-600 mb-2">Escolha sua classe</label>
            <div className="grid grid-cols-1 gap-2">
              {CLASSES.map((cls) => (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => setSelectedClass(cls.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    selectedClass === cls.id
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-dark-600 hover:border-dark-500'
                  }`}
                >
                  <span className="text-2xl">{cls.emoji}</span>
                  <div>
                    <p className="font-medium">{cls.name}</p>
                    <p className="text-xs text-dark-600">{cls.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {register.error && (
            <p className="text-red-400 text-sm text-center">{register.error.message}</p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={register.isPending}>
            {register.isPending ? 'Criando...' : 'Criar Conta'}
          </button>

          <p className="text-center text-sm text-dark-600">
            Ja tem conta?{' '}
            <Link to="/login" className="text-primary-400 hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
