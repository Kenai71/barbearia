import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './pages/Login';
import ClientDashboard from './pages/ClientDashboard';
import BarberDashboard from './pages/BarberDashboard';

function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Verifica sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
      else setLoading(false);
    });

    // 2. Ouve mudanças no Login (Login/Logout)
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

  if (loading) return <div className="h-screen flex items-center justify-center">Carregando...</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={
            !session ? <Login /> : 
            role === 'barber' ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />
          } 
        />
        
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