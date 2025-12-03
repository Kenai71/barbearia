import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { CalendarCheck, LogOut } from 'lucide-react';
import { format } from 'date-fns';

export default function BarberDashboard({ session }) {
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    // Busca agendamentos e o nome do cliente (tabela profiles)
    const { data, error } = await supabase
      .from('appointments')
      .select('*, profiles(full_name, email)')
      .order('date_time', { ascending: true });

    if (!error) setAppointments(data);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
       <header className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-light text-slate-900">Painel do Barbeiro</h1>
        <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 text-slate-500 hover:text-red-500">
          <LogOut size={18} /> Sair
        </button>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-medium flex items-center gap-2">
            <CalendarCheck size={20} /> Próximos Cortes
          </h2>
        </div>
        
        <div className="divide-y divide-slate-100">
          {appointments.map((app) => (
            <div key={app.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <p className="text-lg font-semibold text-slate-800">
                  {format(new Date(app.date_time), 'HH:mm')} - {format(new Date(app.date_time), 'dd/MM')}
                </p>
                <p className="text-slate-500">{app.profiles?.full_name || 'Cliente sem nome'}</p>
                <p className="text-xs text-slate-400">{app.profiles?.email}</p>
              </div>
              
              <div className="flex items-center gap-3">
                 <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase
                  ${app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                  {app.status}
                </span>
                {/* Aqui você poderia adicionar botões para confirmar/cancelar */}
              </div>
            </div>
          ))}
          {appointments.length === 0 && (
            <div className="p-8 text-center text-slate-400">Nenhum agendamento encontrado.</div>
          )}
        </div>
      </div>
    </div>
  );
}