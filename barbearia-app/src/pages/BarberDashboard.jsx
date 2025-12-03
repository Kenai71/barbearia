import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { CalendarCheck, LogOut, Check, X, Clock, User, CheckCircle, TrendingUp } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function BarberDashboard({ session }) {
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({ total: 0, today: 0, pending: 0 });

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, profiles(full_name, email)')
      .order('date_time', { ascending: true });

    if (!error) {
      setAppointments(data);
      // Calcular estatísticas simples
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
    <div className="min-h-screen bg-slate-100 font-sans">
      {/* Header Escuro Profissional */}
      <header className="bg-slate-900 text-white pb-24 pt-8 px-6 shadow-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Painel Administrativo</h1>
            <p className="text-slate-400 text-sm mt-1">Gerencie sua agenda e clientes.</p>
          </div>
          <button 
            onClick={() => supabase.auth.signOut()} 
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors text-sm font-medium border border-white/5"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 -mt-16 pb-12">
        
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Hoje</p>
              <h3 className="text-3xl font-extrabold text-slate-900">{stats.today}</h3>
              <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                <TrendingUp size={12} /> Cortes agendados
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <CalendarCheck size={24} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Pendentes</p>
              <h3 className="text-3xl font-extrabold text-slate-900">{stats.pending}</h3>
              <p className="text-xs text-yellow-600 font-medium mt-1">Aguardando confirmação</p>
            </div>
            <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center text-yellow-600">
              <Clock size={24} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Geral</p>
              <h3 className="text-3xl font-extrabold text-slate-900">{stats.total}</h3>
              <p className="text-xs text-slate-400 font-medium mt-1">Histórico completo</p>
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
              <CheckCircle size={24} />
            </div>
          </div>
        </div>

        {/* Lista de Agenda */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800">Próximos Agendamentos</h2>
            <button className="text-xs font-bold text-blue-600 hover:underline">Ver calendário completo</button>
          </div>
          
          <div className="divide-y divide-slate-100">
            {appointments.length === 0 && (
              <div className="p-12 text-center">
                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarCheck size={24} className="text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium">Nenhum agendamento encontrado.</p>
              </div>
            )}

            {appointments.map((app) => (
              <div key={app.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row justify-between sm:items-center gap-4 group">
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-lg shrink-0 shadow-md">
                    {app.profiles?.full_name?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">
                      {app.profiles?.full_name || 'Cliente sem nome'}
                    </h4>
                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                      <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
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
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 hover:text-red-600 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <span className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2
                      ${app.status === 'confirmed' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
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