import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Mail, Loader2, Scissors, ArrowRight, KeyRound } from 'lucide-react';

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showForgotPass, setShowForgotPass] = useState(false); // Modal Esqueci Senha
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) throw error;
    } catch (error) {
      alert('Erro Google: ' + error.message);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (isRegistering && password !== confirmPassword) {
      alert('As senhas não conferem!');
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        if (!data.session) {
          alert('Cadastro realizado! Verifique seu email para confirmar.');
          setIsRegistering(false);
        } else {
          navigate('/');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/');
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/',
      });
      if (error) throw error;
      alert('Link de recuperação enviado para o seu e-mail!');
      setShowForgotPass(false);
    } catch (error) {
      alert('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 md:p-6 font-sans">
      
      {/* MODAL ESQUECI A SENHA */}
      {showForgotPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
            <button onClick={() => setShowForgotPass(false)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500">✕</button>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <KeyRound size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Recuperar Senha</h3>
              <p className="text-sm text-slate-500">Digite seu e-mail para receber o link.</p>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <input
                type="email"
                placeholder="seu@email.com"
                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition">
                {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Enviar Link'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="flex w-full max-w-5xl bg-white rounded-[2rem] shadow-xl overflow-hidden min-h-[600px] md:min-h-[700px] border border-slate-200">
        
        {/* LADO ESQUERDO */}
        <div className="hidden md:flex w-1/2 bg-gradient-to-br from-blue-50 to-blue-200 relative items-center justify-center p-12">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-50">
              <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
              <div className="absolute top-40 -right-20 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          </div>
          
          <div className="relative z-10 flex flex-col justify-between h-full py-8">
            <div className="flex items-center gap-3 text-blue-900">
              <div className="bg-white/60 p-2.5 rounded-xl backdrop-blur-md shadow-sm">
                <Scissors size={28} className="text-blue-700" />
              </div>
              <span className="font-bold text-xl tracking-widest uppercase">RaulBarber</span>
            </div>
            
            <div className="mt-12">
              <h2 className="text-4xl lg:text-5xl font-extrabold mb-6 leading-tight text-blue-900">
                {isRegistering ? 'Junte-se a nós.' : 'O estilo que \n você merece.'}
              </h2>
              <p className="text-blue-700 text-lg leading-relaxed max-w-md">
                Agende seu horário com os melhores profissionais da cidade. Rápido, fácil e no seu tempo.
              </p>
            </div>

            <div className="text-blue-600 text-sm font-medium mt-auto">
              © 2025 RaulBarber. Todos os direitos reservados.
            </div>
          </div>
        </div>

        {/* LADO DIREITO */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 md:p-16 flex flex-col justify-center bg-white">
          <div className="max-w-md mx-auto w-full">
            
            <div className="mb-10">
              <h1 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">
                {isRegistering ? 'Criar Conta Cliente' : 'Bem-vindo de volta'}
              </h1>
              <p className="text-slate-500 text-base">
                {isRegistering ? 'Cadastre-se para agendar seus cortes.' : 'Insira suas credenciais para acessar.'}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
              {isRegistering && (
                <div className="relative group">
                  <User className="absolute left-4 top-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                  <input
                    type="text"
                    placeholder="Seu nome completo"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-700"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="relative group">
                <Mail className="absolute left-4 top-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                <input
                  type="email"
                  placeholder="seu@email.com"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-700"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                  <input
                    type="password"
                    placeholder="Senha"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-700"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {!isRegistering && (
                  <div className="text-right mt-2">
                    <button type="button" onClick={() => setShowForgotPass(true)} className="text-sm text-blue-600 font-semibold hover:underline">
                      Esqueci a senha
                    </button>
                  </div>
                )}
              </div>

              {isRegistering && (
                <div className="relative group">
                  <User className="absolute left-4 top-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                  <input
                    type="password"
                    placeholder="Confirmar Senha"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-700"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 mt-4"
              >
                {loading ? <Loader2 className="animate-spin" /> : (isRegistering ? 'Cadastrar e Entrar' : 'Entrar na Conta')}
              </button>
            </form>

            <div className="flex items-center my-8">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="mx-4 text-slate-400 text-sm font-medium lowercase">ou</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button 
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-700 font-bold bg-white"
            >
              <GoogleIcon />
              <span>Continuar com Google</span>
            </button>

            <p className="mt-8 text-center text-slate-600 font-medium">
              {isRegistering ? 'Já tem uma conta?' : 'Ainda não tem conta?'} 
              <button 
                onClick={() => setIsRegistering(!isRegistering)}
                className="ml-1 text-blue-600 font-bold hover:underline"
              >
                {isRegistering ? 'Fazer Login' : 'Cadastre-se agora'}
              </button>
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}