import { useState } from 'react';
import { createClient } from '@supabase/supabase-js'; // Importa createClient
import { supabaseUrl, supabaseKey } from '../supabaseClient'; // Importa as chaves
import { Link } from 'react-router-dom';
import { User, Lock, Mail, Loader2, ArrowLeft, UserPlus, CheckCircle } from 'lucide-react';

export default function BarberSignup() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('As senhas não conferem!');
      return;
    }

    setLoading(true);
    setSuccessMsg('');

    try {
      // TRUQUE: Criar um cliente temporário para não deslogar o Admin atual
      const tempSupabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false, // Não salva a sessão no navegador (vital!)
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      const { data, error } = await tempSupabase.auth.signUp({
        email,
        password,
        options: { 
          data: { 
            full_name: fullName,
            role: 'barber'
          } 
        }
      });

      if (error) throw error;

      if (data.user) {
        setSuccessMsg(`Barbeiro ${fullName} cadastrado com sucesso!`);
        // Limpa o formulário
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setFullName('');
      }

    } catch (error) {
      alert('Erro ao cadastrar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-6 font-sans transition-colors duration-300">
      <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        
        <div className="bg-slate-900 dark:bg-black p-6 text-white flex items-center gap-4">
          <Link to="/admin" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Cadastrar Novo Profissional</h1>
            <p className="text-slate-400 text-sm">Adicione um novo membro à equipe.</p>
          </div>
        </div>

        <div className="p-8">
          
          {successMsg && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3 text-green-700 dark:text-green-400">
              <CheckCircle size={20} />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nome Completo</label>
              <div className="relative group">
                <User className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                <input
                  type="text"
                  placeholder="Ex: João Silva"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 dark:text-white transition-all font-medium"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">E-mail Profissional</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                <input
                  type="email"
                  placeholder="barbeiro@empresa.com"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 dark:text-white transition-all font-medium"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Senha Provisória</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                  <input
                    type="password"
                    placeholder="******"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 dark:text-white transition-all font-medium"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Confirmar Senha</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                  <input
                    type="password"
                    placeholder="******"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 dark:text-white transition-all font-medium"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-all duration-300 shadow-lg shadow-green-600/20 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><UserPlus size={20} /> Cadastrar Barbeiro</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}