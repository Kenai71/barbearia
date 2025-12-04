import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { CalendarCheck, LogOut, Check, X, Clock, CheckCircle, TrendingUp, Moon, Sun, Scissors, Settings } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom'; // Importação adicionada

export default function BarberDashboard({ session, isAdmin }) { // Recebe isAdmin
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({ total: 0, today: 0, pending: 0 });
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    fetchAppointments();

    const subscription = supabase
      .channel('appointments_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchAppointments)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *, 
        client:client_id(full_name, email),
        barber:barber_id(full_name)
      `)
      .order('date_time', { ascending: true });

    if (!error && data) {
      setAppointments(data);
      
      const myApps = data.filter(app => app.barber_id === session.user.id);
      
      const todayCount = myApps.filter(app => isToday(new Date(app.date_time))).length;
      const pendingCount = myApps.filter(app => app.status === 'pending').length;
      setStats({ total: myApps.length, today: todayCount, pending: pendingCount });
    }
  };

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', id);
    if (error) alert('Erro: ' + error.message);
    else fetchAppointments();
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-300 font-sans">
      <header className="bg-slate-900 dark:bg-black text-white pb-24 pt-8 px-6 shadow-xl transition-colors">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Painel da Barbearia</h1>
            <p className="text-slate-400 text-sm mt-1">
              {isAdmin ? 'Modo Administrador & Profissional' : 'Visão geral de toda a equipe.'}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            
            {/* BOTÃO DE CONFIGURAÇÕES (SÓ PARA ADMIN) */}
            {isAdmin && (
              <Link 
                to="/admin/settings"
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all border border-blue-500 shadow-lg shadow-blue-900/50"
                title="Configurações da Loja"
              >
                <Settings size={18} />
              </Link>
            )}

            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all border border-white/5"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button 
              onClick={() => supabase.auth.signOut()} 
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors text-sm font-medium border border-white/5"
            >
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 -mt-16 pb-12">
        
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-colors">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Seus cortes hoje</p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.today}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
              <CalendarCheck size={24} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-colors">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Seus Pendentes</p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.pending}</h3>
            </div>
            <div className="w-12 h-12 bg-yellow-50 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center text-yellow-600 dark:text-yellow-400">
              <Clock size={24} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-colors">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Seu Total</p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.total}</h3>
            </div>
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300">
              <CheckCircle size={24} />
            </div>
          </div>
        </div>

        {/* Lista de Agenda */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Agenda Geral</h2>
          </div>
          
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {appointments.length === 0 && (
              <div className="p-12 text-center text-slate-500">Nenhum agendamento encontrado.</div>
            )}

            {appointments.map((app) => {
              const isMine = app.barber_id === session.user.id;

              return (
                <div 
                  key={app.id} 
                  className={`p-6 transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-4 group border-l-4 
                  ${isMine 
                    ? 'bg-blue-50/40 dark:bg-blue-900/10 border-l-blue-600' 
                    : 'bg-white dark:bg-slate-800 border-l-transparent opacity-80 hover:opacity-100' 
                  }`}
                >
                  
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 shadow-sm
                      ${isMine 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}>
                      {app.client?.full_name?.charAt(0) || 'C'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-900 dark:text-white text-lg">
                          {app.client?.full_name || 'Cliente sem nome'}
                        </h4>
                        
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border
                          ${isMine 
                            ? 'bg-blue-100 text-blue-700 border-blue-200' 
                            : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'}`}>
                          {isMine ? 'PARA VOCÊ' : `Profissional: ${app.barber?.full_name}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-1">
                        <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 font-medium">
                          <Clock size={12} />
                          {format(new Date(app.date_time), 'HH:mm')}
                        </span>
                        <span>{format(new Date(app.date_time), "dd 'de' MMMM", { locale: ptBR })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                    {isMine ? (
                      app.status === 'pending' ? (
                        <>
                          <button 
                            onClick={() => updateStatus(app.id, 'confirmed')}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-sm"
                          >
                            <Check size={16} /> Aceitar
                          </button>
                          <button 
                             onClick={() => updateStatus(app.id, 'cancelled')} 
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-600 hover:text-red-600 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2
                            ${app.status === 'confirmed' 
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30' 
                              : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/30'}`}>
                            {app.status === 'confirmed' ? 'Confirmado' : app.status}
                          </span>
                          
                          {app.status === 'confirmed' && (
                            <button 
                              onClick={() => updateStatus(app.id, 'completed')}
                              className="ml-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-2 rounded-lg text-slate-400 hover:text-green-600 transition-colors"
                              title="Marcar como finalizado"
                            >
                              <CheckCircle size={20} />
                            </button>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="opacity-50 flex items-center gap-2 text-sm font-medium text-slate-500">
                         <Scissors size={14} /> 
                         Agenda de {app.barber?.full_name?.split(' ')[0]}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}