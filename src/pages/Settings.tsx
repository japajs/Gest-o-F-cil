import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { Sun, Moon } from 'lucide-react';

interface ProfileForm { full_name: string; }
interface PasswordForm { current_password: string; new_password: string; confirm_password: string; }

export default function Settings() {
  const { profile, user } = useAuth();
  const { dark, toggle } = useDarkMode();
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileOk, setProfileOk] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwOk, setPwOk] = useState(false);

  const profileForm = useForm<ProfileForm>({ defaultValues: { full_name: profile?.full_name ?? '' } });
  const pwForm = useForm<PasswordForm>();

  async function saveProfile(data: ProfileForm) {
    setProfileSaving(true);
    await supabase.from('profiles').update({ full_name: data.full_name }).eq('id', profile!.id);
    setProfileSaving(false);
    setProfileOk(true);
    setTimeout(() => setProfileOk(false), 3000);
  }

  async function changePassword(data: PasswordForm) {
    setPwError('');
    if (data.new_password !== data.confirm_password) { setPwError('As senhas não coincidem.'); return; }
    if (data.new_password.length < 6) { setPwError('Mínimo 6 caracteres.'); return; }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: data.new_password });
    setPwSaving(false);
    if (error) { setPwError(error.message); return; }
    setPwOk(true);
    pwForm.reset();
    setTimeout(() => setPwOk(false), 3000);
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações</h1>

      {/* Profile */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Perfil</h2>
        <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-4">
          <div>
            <label className="label">Nome completo</label>
            <input {...profileForm.register('full_name')} className="input" />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input value={user?.email ?? ''} readOnly className="input bg-gray-50 dark:bg-gray-800 cursor-not-allowed" />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={profileSaving} className="btn-primary">{profileSaving ? 'Salvando...' : 'Salvar perfil'}</button>
            {profileOk && <span className="text-sm text-green-600">Salvo com sucesso!</span>}
          </div>
        </form>
      </div>

      {/* Password */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Alterar senha</h2>
        <form onSubmit={pwForm.handleSubmit(changePassword)} className="space-y-4">
          <div>
            <label className="label">Nova senha</label>
            <input {...pwForm.register('new_password')} type="password" className="input" placeholder="••••••••" />
          </div>
          <div>
            <label className="label">Confirmar nova senha</label>
            <input {...pwForm.register('confirm_password')} type="password" className="input" placeholder="••••••••" />
          </div>
          {pwError && <p className="text-sm text-red-600">{pwError}</p>}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={pwSaving} className="btn-primary">{pwSaving ? 'Alterando...' : 'Alterar senha'}</button>
            {pwOk && <span className="text-sm text-green-600">Senha alterada!</span>}
          </div>
        </form>
      </div>

      {/* Appearance */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Aparência</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Modo escuro</p>
            <p className="text-xs text-gray-400 mt-0.5">Alterna entre tema claro e escuro</p>
          </div>
          <button
            onClick={toggle}
            className={`relative w-14 h-7 rounded-full transition-colors ${dark ? 'bg-primary-600' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform flex items-center justify-center ${dark ? 'translate-x-7' : ''}`}>
              {dark ? <Moon size={10} className="text-primary-600" /> : <Sun size={10} className="text-gray-500" />}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
