import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/ui/Spinner';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
type FormData = z.infer<typeof schema>;

export default function Login() {
  const { signIn, user } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  if (user) return <Navigate to="/dashboard" replace />;

  async function onSubmit(data: FormData) {
    setServerError('');
    const { error } = await signIn(data.email, data.password);
    if (error) setServerError('E-mail ou senha incorretos.');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-950 dark:to-gray-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-lg mb-4">
            <span className="text-white font-bold text-2xl">FF</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financeiro Fácil</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestão financeira simplificada</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Entrar na sua conta</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <input {...register('email')} type="email" placeholder="seu@email.com" className="input" autoComplete="email" />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            {serverError && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                {serverError}
              </p>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
              {isSubmitting ? <><Spinner size={16} /> Entrando...</> : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
