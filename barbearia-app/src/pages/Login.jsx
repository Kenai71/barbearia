import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Scissors } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegistering) {
        // 1. Criar usuário na Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (authError) throw authError;

        // 2. Criar perfil no banco (Padrão: client)
        if (authData.user) {
          const { error: profileError } = await supabase.from('profiles').insert([
            { id: authData.user.id, email, full_name: fullName, role: 'client' }
          ]);
          if (profileError) throw profileError;
          alert('Cadastro realizado! Faça login.');
          setIsRegistering(false);
        }
      } else {
        // Login
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/'); // O App.jsx vai redirecionar para a dashboard correta
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="flex justify-center mb-6 text-slate-800">
          <Scissors size={48} />
        </div>
        <h2 className="text-2xl font-light text-center mb-8">
          {isRegistering ? 'Crie sua conta' : 'Bem-vindo de volta'}
        </h2>

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegistering && (
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Nome Completo"
                className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}
          
          <div className="relative">
            <User className="absolute left-3 top-3 text-slate-400" size={20} />
            <input
              type="email"
              placeholder="Seu email"
              className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
            <input
              type="password"
              placeholder="Sua senha"
              className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            disabled={loading}
            className="w-full bg-slate-900 text-white py-3 rounded-lg hover:bg-slate-800 transition-colors font-medium"
          >
            {loading ? 'Carregando...' : (isRegistering ? 'Cadastrar' : 'Entrar')}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-slate-500">
          {isRegistering ? 'Já tem conta? ' : 'Não tem conta? '}
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-slate-900 font-semibold hover:underline"
          >
            {isRegistering ? 'Faça Login' : 'Cadastre-se'}
          </button>
        </p>
      </div>
    </div>
  );
}