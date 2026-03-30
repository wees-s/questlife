import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLogin } from '../api/hooks';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const login = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { email, password },
      { onSuccess: () => navigate('/') },
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-primary-400 mb-2">LifeQuest</h1>
          <p className="text-dark-600">Transforme sua vida em um RPG</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="text-xl font-semibold text-center">Entrar</h2>

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
            />
          </div>

          {login.error && (
            <p className="text-red-400 text-sm text-center">{login.error.message}</p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={login.isPending}>
            {login.isPending ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="text-center text-sm text-dark-600">
            Ainda nao tem conta?{' '}
            <Link to="/register" className="text-primary-400 hover:underline">
              Criar conta
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
