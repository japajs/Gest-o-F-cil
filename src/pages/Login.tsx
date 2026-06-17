import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Spinner } from '../components/ui/Spinner';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

const registerSchema = z.object({
  full_name: z.string().min(2, 'Informe seu nome completo'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirm_password: z.string(),
}).refine(d => d.password === d.confirm_password, {
  message: 'As senhas não coincidem',
  path: ['confirm_password'],
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export default function Login() {
  const { signIn, user } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const loginForm = useForm<LoginData>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterData>({ resolver: zodResolver(registerSchema) });

  if (user) return <Navigate to="/dashboard" replace />;

  async function onLogin(data: LoginData) {
    setServerError('');
    const { error } = await signIn(data.email, data.password);
    if (error) setServerError('E-mail ou senha incorretos. Verifique se seu e-mail foi confirmado.');
  }

  async function onRegister(data: RegisterData) {
    setServerError('');
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.full_name } },
    });
    if (error) {
      setServerError(error.message);
      return;
    }
    setRegisterSuccess(true);
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

        <div className="card p-8">
          {/* Tabs */}
          <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 mb-6">
            <button
              onClick={() => { setTab('login'); setServerError(''); setRegisterSuccess(false); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'login' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setTab('register'); setServerError(''); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'register' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
            >
              Criar conta
            </button>
          </div>

          {/* LOGIN */}
          {tab === 'login' && (
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
              <div>
                <label className="label">E-mail</label>
                <input {...loginForm.register('email')} type="email" placeholder="seu@email.com" className="input" autoComplete="email" />
                {loginForm.formState.errors.email && <p className="text-xs text-red-500 mt-1">{loginForm.formState.errors.email.message}</p>}
              </div>
              <div>
                <label className="label">Senha</label>
                <div className="relative">
                  <input {...loginForm.register('password')} type={showPass ? 'text' : 'password'} placeholder="••••••••" className="input pr-10" autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {loginForm.formState.errors.password && <p className="text-xs text-red-500 mt-1">{loginForm.formState.errors.password.message}</p>}
              </div>
              {serverError && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{serverError}</p>
              )}
              <button type="submit" disabled={loginForm.formState.isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
                {loginForm.formState.isSubmitting ? <><Spinner size={16} /> Entrando...</> : 'Entrar'}
              </button>
            </form>
          )}

          {/* REGISTER */}
          {tab === 'register' && (
            registerSuccess ? (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Conta criada com sucesso!</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Verifique seu e-mail para confirmar a conta e depois faça o login.</p>
                <button onClick={() => { setTab('login'); setRegisterSuccess(false); }} className="btn-primary w-full mt-2">
                  Ir para o login
                </button>
              </div>
            ) : (
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                <div>
                  <label className="label">Nome completo</label>
                  <input {...registerForm.register('full_name')} type="text" placeholder="Seu nome" className="input" autoComplete="name" />
                  {registerForm.formState.errors.full_name && <p className="text-xs text-red-500 mt-1">{registerForm.formState.errors.full_name.message}</p>}
                </div>
                <div>
                  <label className="label">E-mail</label>
                  <input {...registerForm.register('email')} type="email" placeholder="seu@email.com" className="input" autoComplete="email" />
                  {registerForm.formState.errors.email && <p className="text-xs text-red-500 mt-1">{registerForm.formState.errors.email.message}</p>}
                </div>
                <div>
                  <label className="label">Senha</label>
                  <div className="relative">
                    <input {...registerForm.register('password')} type={showPass ? 'text' : 'password'} placeholder="••••••••" className="input pr-10" />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {registerForm.formState.errors.password && <p className="text-xs text-red-500 mt-1">{registerForm.formState.errors.password.message}</p>}
                </div>
                <div>
                  <label className="label">Confirmar senha</label>
                  <div className="relative">
                    <input {...registerForm.register('confirm_password')} type={showConfirm ? 'text' : 'password'} placeholder="••••••••" className="input pr-10" />
                    <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {registerForm.formState.errors.confirm_password && <p className="text-xs text-red-500 mt-1">{registerForm.formState.errors.confirm_password.message}</p>}
                </div>
                {serverError && (
                  <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{serverError}</p>
                )}
                <button type="submit" disabled={registerForm.formState.isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
                  {registerForm.formState.isSubmitting ? <><Spinner size={16} /> Criando conta...</> : 'Criar conta'}
                </button>
              </form>
            )
          )}
        </div>
      </div>
    </div>
  );
}
