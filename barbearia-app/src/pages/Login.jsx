import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Scissors, Mail, ArrowRight, Loader2 } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Estados do formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegistering) {
        // CADASTRO
        // Enviamos o nome no "options" para o banco pegar automaticamente
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName } 
          }
        });
        if (error) throw error;
        alert('Cadastro realizado! Verifique seu email ou faça login.');
        setIsRegistering(false);
      } else {
        // LOGIN
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/'); // O App.jsx decide para onde ir
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[url('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2074&auto=format&fit=crop')] bg-cover bg-center">
      {/* Máscara escura sobre a imagem de fundo */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>

      {/* Cartão de Login (Glass effect) */}
      <div className="relative z-10 w-full max-w-md glass p-8 rounded-2xl animate-in fade-in zoom-in duration-500">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-white mb-4 shadow-lg">
            <Scissors size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Barbearia Premium</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isRegistering ? 'Crie sua conta em segundos' : 'Agende seu corte com estilo'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegistering && (
            <div className="relative group">
              <User className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Nome Completo"
                className="input-field"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="relative group">
            <Mail className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={20} />
            <input
              type="email"
              placeholder="Seu melhor email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={20} />
            <input
              type="password"
              placeholder="Sua senha secreta"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2 mt-6">
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                {isRegistering ? 'Criar Conta' : 'Entrar na Conta'}
                {!loading && <ArrowRight size={18} />}
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            {isRegistering ? 'Já é nosso cliente?' : 'Primeira vez aqui?'}
          </p>
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-slate-900 font-semibold text-sm hover:underline mt-1"
          >
            {isRegistering ? 'Fazer Login' : 'Criar uma conta nova'}
          </button>
        </div>
      </div>
    </div>
  );
}