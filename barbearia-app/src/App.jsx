import { useState, useEffect, useRef } from 'react';
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const userIdRef = useRef(null);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;

    const verificarUsuario = async (sessaoAtual) => {
      userIdRef.current = sessaoAtual?.user?.id || null;

      if (!sessaoAtual?.user) {
        if (montado.current) {
          setSession(null);
          setRole(null);
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }

      setSession(sessaoAtual);
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role, is_admin')
          .eq('id', sessaoAtual.user.id)
          .maybeSingle();

        if (montado.current) {
          if (data) {
            setRole(data.role);
            setIsAdmin(data.is_admin || false);
          } else {
            console.log("Perfil ausente. Criando...");
            const roleToSave = sessaoAtual.user.user_metadata?.role || 'client';
            const { error: insertError } = await supabase.from('profiles').insert([{
              id: sessaoAtual.user.id,
              email: sessaoAtual.user.email,
              full_name: sessaoAtual.user.user_metadata?.full_name || 'Usuário',
              role: roleToSave
            }]);
            
            if (!insertError) {
              setRole(roleToSave);
              setIsAdmin(false);
            }
          }
        }
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
      } finally {
        if (montado.current) setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      verificarUsuario(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const novoId = newSession?.user?.id || null;
      if (novoId !== userIdRef.current) { 
        setLoading(true);
        verificarUsuario(newSession);
      }
    });

    return () => {
      montado.current = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-400 gap-4">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Carregando...</p>
      </div>
    );
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
            <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
              <p className="text-slate-500">Perfil não identificado.</p>
              <button onClick={() => { supabase.auth.signOut(); window.location.reload(); }} className="px-4 py-2 bg-slate-200 rounded text-sm hover:bg-slate-300">
                Sair e Tentar Novamente
              </button>
            </div>
          } 
        />

        <Route path="/dashboard" element={session && role === 'client' ? <ClientDashboard session={session} /> : <Navigate to="/" />} />
        
        <Route path="/admin" element={session && role === 'barber' ? <BarberDashboard session={session} isAdmin={isAdmin} /> : <Navigate to="/" />} />
        
        <Route path="/admin/settings" element={session && role === 'barber' && isAdmin ? <AdminSettings /> : <Navigate to="/admin" />} />
        
        {/* ROTA PROTEGIDA PARA CADASTRO DE BARBEIRO */}
        <Route path="/admin/register-barber" element={session && role === 'barber' && isAdmin ? <BarberSignup /> : <Navigate to="/admin" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;