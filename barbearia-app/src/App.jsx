import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './pages/Login';
import BarberSignup from './pages/BarberSignup';
import ClientDashboard from './pages/ClientDashboard';
import BarberDashboard from './pages/BarberDashboard';

function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verifica sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
      else setLoading(false);
    });

    // Escuta mudanças de login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        // Se logou, busca a role. Se a role já existe, não busca de novo pra não piscar.
        if (!role) fetchRole(session.user.id);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setRole(data?.role);
    } catch (error) {
      console.error("Erro ao buscar role:", error);
      // Se der erro, tenta manter o usuário logado mas sem role definida por enquanto
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-400 gap-4">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Carregando sistema...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Rota padrão (Login) */}
        <Route 
          path="/" 
          element={
            !session ? <Login /> : 
            role === 'barber' ? <Navigate to="/admin" /> : 
            role === 'client' ? <Navigate to="/dashboard" /> :
            /* Se tem sessão mas não tem role (erro ou delay), segura aqui */
            <div className="h-screen flex items-center justify-center">Preparando seu perfil...</div>
          } 
        />

        {/* CORREÇÃO: Removemos o bloqueio (!session) para o cadastro não ser interrompido */}
        <Route path="/barber-signup" element={<BarberSignup />} />
        
        {/* Áreas logadas */}
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