import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Mail, Loader2, Scissors, ArrowLeft, Briefcase } from 'lucide-react';

export default function BarberSignup() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Cria o usuário
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });

      if (error) throw error;

      if (data.user) {
        // 2. Atualiza para 'barber'
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'barber' })
          .eq('id', data.user.id);

        if (updateError) throw updateError;

        alert('Cadastro profissional realizado com sucesso! Bem-vindo ao time.');
        navigate(0); // Recarrega para entrar no dashboard de barbeiro
      }

    } catch (error) {
      alert('Erro no cadastro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 md:p-6 font-sans">
      <div className="flex w-full max-w-5xl bg-white rounded-[2rem] shadow-xl overflow-hidden min-h-[600px] md:min-h-[700px] border border-slate-200">
        
        {/* LADO ESQUERDO: Visual Azul (Igual ao Login) */}
        <div className="hidden md:flex w-1/2 bg-gradient-to-br from-blue-50 to-blue-200 relative items-center justify-center p-12">
          {/* Elementos decorativos animados */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-50">
              <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
              <div className="absolute top-40 -right-20 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          </div>
          
          <div className="relative z-10 flex flex-col justify-between h-full py-8">
            <div className="flex items-center gap-3 text-blue-900">
              <div className="bg-white/60 p-2.5 rounded-xl backdrop-blur-md shadow-sm">
                <Scissors size={28} className="text-blue-700" />
              </div>
              <span className="font-bold text-xl tracking-widest uppercase">BarberPro</span>
            </div>
            
            <div className="mt-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/50 text-blue-800 text-xs font-bold uppercase tracking-wide mb-4 border border-blue-200">
                <Briefcase size={14} /> Área do Profissional
              </div>
              <h2 className="text-4xl lg:text-5xl font-extrabold mb-6 leading-tight text-blue-900">
                Gerencie seu <br/>talento.
              </h2>
              <p className="text-blue-700 text-lg leading-relaxed max-w-md">
                Entre para o time dos melhores. Organize sua agenda, seus clientes e seus ganhos em um só lugar.
              </p>
            </div>

            <div className="text-blue-600 text-sm font-medium mt-auto">
              © 2025 BarberPro Partners.
            </div>
          </div>
        </div>

        {/* LADO DIREITO: Formulário de Cadastro */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 md:p-16 flex flex-col justify-center bg-white relative">
          
          {/* Botão Voltar */}
          <Link to="/" className="absolute top-8 left-8 text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-2 text-sm font-medium">
            <ArrowLeft size={16} /> Voltar
          </Link>

          <div className="max-w-md mx-auto w-full mt-10 md:mt-0">
            
            <div className="mb-10">
              <h1 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">
                Cadastro de Barbeiro
              </h1>
              <p className="text-slate-500 text-base">
                Crie sua conta profissional para começar a atender.
              </p>
            </div>

            <form onSubmit={handleSignup} className="space-y-5">
              
              <div className="relative group">
                <User className="absolute left-4 top-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                <input
                  type="text"
                  placeholder="Nome Profissional (Ex: João Barber)"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-700"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="relative group">
                <Mail className="absolute left-4 top-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                <input
                  type="email"
                  placeholder="email@profissional.com"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-700"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                <input
                  type="password"
                  placeholder="Senha segura"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-700"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 mt-4"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Cadastrar-se como Profissional'}
              </button>
            </form>

            <p className="mt-8 text-center text-slate-400 text-xs">
              Ao criar uma conta de parceiro, você concorda com nossos termos de serviço para profissionais.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}