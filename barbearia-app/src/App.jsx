import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient.js';
import Login from './pages/Login.jsx';
import BarberSignup from './pages/BarberSignup.jsx';
import ClientDashboard from './pages/ClientDashboard.jsx';
import BarberDashboard from './pages/BarberDashboard.jsx';

function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    // 1. Verifica sessão inicial ao carregar a página
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session) {
          await fetchRole(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Erro na sessão:", error);
        setLoading(false);
      }
    };
    initSession();

    // 2. Escuta mudanças de login em tempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        setLoading(true);
        setErrorMsg(null);
        await fetchRole(session.user.id);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Lógica de "Retry" melhorada
  const fetchRole = async (userId) => {
    let attempts = 0;
    const maxAttempts = 10; 

    while (attempts < maxAttempts) {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      // Correção aqui: removido o erro de digitação
      if (!error && data && data.role) {
        setRole(data.role);
        setLoading(false);
        return; 
      }

      // Espera 500ms antes de tentar de novo
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    // Se falhou todas as vezes, mostra erro ao invés de travar
    console.error("Não foi possível carregar o perfil do usuário.");
    setErrorMsg("Não foi possível carregar seu perfil. O sistema pode estar lento.");
    setLoading(false); 
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-400 gap-4">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Conectando...</p>
      </div>
    );
  }

  // Tela de erro caso o perfil não carregue
  if (session && errorMsg) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600 gap-4 p-6 text-center">
        <h2 className="text-xl font-bold text-slate-900">Ops!</h2>
        <p>{errorMsg}</p>
        <div className="flex gap-4">
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">Tentar Novamente</button>
          <button onClick={() => supabase.auth.signOut()} className="px-4 py-2 border border-slate-300 rounded-lg">Sair</button>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Rota Raíz: Decide para onde o usuário vai */}
        <Route 
          path="/" 
          element={
            !session ? <Login /> : 
            role === 'barber' ? <Navigate to="/admin" /> : 
            role === 'client' ? <Navigate to="/dashboard" /> :
            // Fallback final
            <div className="h-screen flex items-center justify-center">Carregando permissões...</div>
          } 
        />

        <Route path="/barber-signup" element={<BarberSignup />} />
        
        {/* Rotas Protegidas */}
        <Route 
          path="/dashboard" 
          element={session && role === 'client' ? <ClientDashboard session={session} /> : <Navigate to="/" />} 
        />
        
        <Route 
          path="/admin" 
          element={session && role === 'barber' ? <BarberDashboard session={session} /> : <Navigate to="/" />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;