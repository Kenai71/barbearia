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

  useEffect(() => {
    // 1. Verifica sessão inicial ao carregar a página
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        await fetchRole(session.user.id);
      } else {
        setLoading(false);
      }
    };
    initSession();

    // 2. Escuta mudanças de login em tempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        // Se logou, ativa o loading e busca a role imediatamente
        setLoading(true);
        await fetchRole(session.user.id);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Lógica de "Retry" (Tentar Novamente) para buscar o Perfil
  // Garante que o sistema espere o Trigger do banco criar o perfil antes de desistir
  const fetchRole = async (userId) => {
    let attempts = 0;
    const maxAttempts = 10; // Tenta por 5 segundos (10 vezes de 0.5s)

    while (attempts < maxAttempts) {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (data && data.role) {
        setRole(data.role);
        setLoading(false); // Sucesso! Sai da função e libera a tela.
        return; 
      }

      // Se falhou, espera 500ms e tenta de novo
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    // Se falhou todas as vezes
    console.error("Não foi possível carregar o perfil do usuário.");
    setLoading(false); 
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-400 gap-4">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Acessando sistema...</p>
      </div>
    );
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
            // Fallback: Se tem sessão mas falhou em achar a role, volta pro Login
            <Navigate to="/" onClick={() => supabase.auth.signOut()} /> 
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