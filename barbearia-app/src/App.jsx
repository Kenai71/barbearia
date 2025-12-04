import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient.js';
import Login from './pages/Login.jsx';
import BarberSignup from './pages/BarberSignup.jsx';
import ClientDashboard from './pages/ClientDashboard.jsx';
import BarberDashboard from './pages/BarberDashboard.jsx';
import AdminSettings from './pages/AdminSettings.jsx';

function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false); // Novo estado para controlar admin
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    // 1. Verifica sessão inicial
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session) {
          await fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Erro na sessão:", error);
        setLoading(false);
      }
    };
    initSession();

    // 2. Escuta mudanças em tempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      
      // Otimização para não recarregar em refresh de token
      if (event === 'TOKEN_REFRESHED' && session?.user?.id === newSession?.user?.id) {
        setSession(newSession);
        return;
      }

      setSession(newSession);

      if (newSession) {
        // Se trocou de usuário ou acabou de logar
        if (!session || session.user.id !== newSession.user.id) {
          setLoading(true);
          setErrorMsg(null);
          await fetchProfile(newSession.user.id);
        }
      } else {
        setRole(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [session]);

  const fetchProfile = async (userId) => {
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      // MODIFICADO: Agora busca role E is_admin
      const { data, error } = await supabase
        .from('profiles')
        .select('role, is_admin')
        .eq('id', userId)
        .single();
      
      if (!error && data) {
        setRole(data.role);
        setIsAdmin(data.is_admin || false); // Salva se é admin
        setLoading(false);
        return; 
      }

      await new Promise(resolve => setTimeout(resolve, 800));
      attempts++;
    }

    console.error("Não foi possível carregar o perfil.");
    setErrorMsg("Não foi possível carregar seu perfil. O banco de dados pode estar indisponível.");
    setLoading(false); 
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-400 gap-4">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Carregando sistema...</p>
      </div>
    );
  }

  if (session && errorMsg) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600 gap-4 p-6 text-center">
        <h2 className="text-xl font-bold text-slate-900">Ops!</h2>
        <p>{errorMsg}</p>
        <div className="flex gap-4">
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold shadow hover:bg-blue-700 transition">
            Tentar Novamente
          </button>
          <button onClick={() => supabase.auth.signOut()} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 transition">
            Sair
          </button>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={
            !session ? <Login /> : 
            role === 'barber' ? <Navigate to="/admin" /> : 
            role === 'client' ? <Navigate to="/dashboard" /> :
            <div className="h-screen flex items-center justify-center bg-slate-50 gap-4">
              <p className="text-slate-500">Verificando permissões...</p>
              <button onClick={() => supabase.auth.signOut()} className="text-xs text-red-500 hover:underline">Sair</button>
            </div>
          } 
        />

        <Route path="/barber-signup" element={<BarberSignup />} />
        
        <Route 
          path="/dashboard" 
          element={session && role === 'client' ? <ClientDashboard session={session} /> : <Navigate to="/" />} 
        />
        
        {/* Passamos isAdmin para o Dashboard */}
        <Route 
          path="/admin" 
          element={session && role === 'barber' ? <BarberDashboard session={session} isAdmin={isAdmin} /> : <Navigate to="/" />} 
        />

        {/* Rota de Configurações protegida: Só entra se for Barbeiro E Admin */}
        <Route 
          path="/admin/settings" 
          element={session && role === 'barber' && isAdmin ? <AdminSettings /> : <Navigate to="/admin" />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;