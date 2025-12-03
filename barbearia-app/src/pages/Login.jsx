import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Mail, Loader2, Chrome } from 'lucide-react'; // Chrome usado como ícone do Google

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const navigate = useNavigate();

  // Função de Login com Google
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) throw error;
    } catch (error) {
      alert('Erro ao conectar com Google: ' + error.message);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegistering) {
        // Cadastro
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        alert('Cadastro realizado! Verifique seu email ou faça login.');
        setIsRegistering(false);
      } else {
        // Login com Email
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/dashboard'); // Redireciona para o dashboard
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
      
      {/* Card Dividido */}
      <div className="flex w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden min-h-[600px]">
        
        {/* LADO ESQUERDO - Imagem */}
        <div className="hidden md:flex w-1/2 bg-blue-500 items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-blue-600 opacity-20 rounded-full scale-150 translate-x-1/2 translate-y-1/2"></div>
          
          <div className="relative z-10 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Bem-vindo de volta!</h2>
            <p className="text-blue-100 mb-8">Agende seu corte com os melhores profissionais.</p>
            <img 
              src="https://illustrations.popsy.co/amber/barber.svg" 
              alt="Ilustração Barbearia" 
              className="w-full h-auto drop-shadow-lg transform hover:scale-105 transition-transform duration-300"
            />
          </div>
        </div>

        {/* LADO DIREITO - Formulário */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          
          <div className="mb-8 text-center md:text-left">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {isRegistering ? 'Criar Conta' : 'Login'}
            </h1>
            <p className="text-slate-400">
              {isRegistering ? 'Preencha seus dados abaixo' : 'Entre com sua conta'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {isRegistering && (
              <div className="relative">
                <User className="absolute left-3 top-3.5 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Nome de Usuário"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-slate-400" size={20} />
              <input
                type="email"
                placeholder="nome@email.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-slate-400" size={20} />
              <input
                type="password"
                placeholder="Senha"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-all duration-300 shadow-md flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : (isRegistering ? 'Cadastrar' : 'Entrar')}
            </button>
          </form>

          <div className="flex items-center my-6">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="mx-4 text-slate-400 text-sm">Ou logar com</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Botão Google */}
          <div className="flex justify-center gap-4">
            <button 
              onClick={handleGoogleLogin}
              className="flex items-center gap-2 px-6 py-2 border border-slate-200 rounded-full hover:bg-slate-50 transition-colors text-slate-600 font-medium"
            >
              <Chrome size={20} className="text-red-500" /> Google
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-slate-500">
            {isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?'} 
            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              className="ml-1 text-blue-500 font-semibold hover:underline"
            >
              {isRegistering ? 'Fazer Login' : 'Inscrever-se'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}