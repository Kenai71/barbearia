import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { CalendarCheck, LogOut, Check, X, Clock, User, CheckCircle, TrendingUp, Moon, Sun } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function BarberDashboard({ session }) {
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({ total: 0, today: 0, pending: 0 });
  
  // Estado para controlar o tema
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  // Efeito do Dark Mode
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
  }, []);

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, profiles:client_id(full_name, email)')
      .order('date_time', { ascending: true });

    if (!error) {
      setAppointments(data);
      const todayCount = data.filter(app => isToday(new Date(app.date_time))).length;
      const pendingCount = data.filter(app => app.status === 'pending').length;
      setStats({ total: data.length, today: todayCount, pending: pendingCount });
    }
  };

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', id);
    if (error) alert('Erro: ' + error.message);
    else fetchAppointments();
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-300 font-sans">
      {/* Header */}
      <header className="bg-slate-900 dark:bg-black text-white pb-24 pt-8 px-6 shadow-xl transition-colors">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Painel Administrativo</h1>
            <p className="text-slate-400 text-sm mt-1">Gerencie sua agenda e clientes.</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Botão de Tema Admin */}
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all border border-white/5"
              title="Alternar Tema"
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
              <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Hoje</p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.today}</h3>
              <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                <TrendingUp size={12} /> Cortes agendados
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
              <CalendarCheck size={24} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-colors">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Pendentes</p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.pending}</h3>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mt-1">Aguardando confirmação</p>
            </div>
            <div className="w-12 h-12 bg-yellow-50 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center text-yellow-600 dark:text-yellow-400">
              <Clock size={24} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-colors">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Geral</p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.total}</h3>
              <p className="text-xs text-slate-400 font-medium mt-1">Histórico completo</p>
            </div>
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300">
              <CheckCircle size={24} />
            </div>
          </div>
        </div>

        {/* Lista de Agenda */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Próximos Agendamentos</h2>
            <button className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">Ver calendário completo</button>
          </div>
          
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {appointments.length === 0 && (
              <div className="p-12 text-center">
                <div className="bg-slate-50 dark:bg-slate-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarCheck size={24} className="text-slate-300 dark:text-slate-500" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhum agendamento encontrado.</p>
              </div>
            )}

            {appointments.map((app) => (
              <div key={app.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex flex-col sm:flex-row justify-between sm:items-center gap-4 group">
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full flex items-center justify-center font-bold text-lg shrink-0 shadow-md">
                    {app.profiles?.full_name?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {app.profiles?.full_name || 'Cliente sem nome'}
                    </h4>
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
                  {app.status === 'pending' ? (
                    <>
                      <button 
                        onClick={() => updateStatus(app.id, 'confirmed')}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
                      >
                        <Check size={16} /> Aceitar
                      </button>
                      <button 
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-600 hover:text-red-600 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <span className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2
                      ${app.status === 'confirmed' 
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30' 
                        : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/30'}`}>
                      {app.status === 'confirmed' ? <CheckCircle size={14} /> : <CheckCircle size={14} />}
                      {app.status === 'confirmed' ? 'Confirmado' : 'Finalizado'}
                    </span>
                  )}
                  
                  {app.status === 'confirmed' && (
                    <button 
                      onClick={() => updateStatus(app.id, 'completed')}
                      className="ml-2 text-slate-400 hover:text-green-600 transition-colors p-2"
                      title="Marcar como finalizado"
                    >
                      <CheckCircle size={20} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}