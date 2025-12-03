import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './pages/Login';
import BarberSignup from './pages/BarberSignup'; // Importe a nova página
import ClientDashboard from './pages/ClientDashboard';
import BarberDashboard from './pages/BarberDashboard';

function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
      else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    setRole(data?.role);
    setLoading(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50">Carregando...</div>;

  return (
    <BrowserRouter>
      <Routes>
        {/* Rota padrão (Login de Clientes) */}
        <Route 
          path="/" 
          element={
            !session ? <Login /> : 
            role === 'barber' ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />
          } 
        />

        {/* Nova Rota: Cadastro de Barbeiros (Aberto, sem login prévio) */}
        <Route 
          path="/barber-signup" 
          element={!session ? <BarberSignup /> : <Navigate to="/" />} 
        />
        
        {/* Área do Cliente */}
        <Route 
          path="/dashboard" 
          element={session && role === 'client' ? <ClientDashboard session={session} /> : <Navigate to="/" />} 
        />
        
        {/* Área do Barbeiro */}
        <Route 
          path="/admin" 
          element={session && role === 'barber' ? <BarberDashboard session={session} /> : <Navigate to="/" />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;