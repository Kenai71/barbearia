import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, Clock, LogOut } from 'lucide-react';
import { format } from 'date-fns';

export default function ClientDashboard({ session }) {
  const [date, setDate] = useState('');
  const [myAppointments, setMyAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Horários fixos da barbearia
  const timeSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

  useEffect(() => {
    fetchMyAppointments();
  }, []);

  const fetchMyAppointments = async () => {
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('client_id', session.user.id)
      .order('date_time', { ascending: true });
    setMyAppointments(data || []);
  };

  const handleBook = async (time) => {
    if (!date) return alert('Selecione uma data primeiro');
    
    // Combina data e hora para salvar (Ex: 2023-10-25T14:00:00)
    const dateTime = new Date(`${date}T${time}:00`);

    const { error } = await supabase.from('appointments').insert([
      { client_id: session.user.id, date_time: dateTime.toISOString(), status: 'pending' }
    ]);

    if (error) alert('Erro ao agendar: ' + error.message);
    else {
      alert('Agendado com sucesso!');
      fetchMyAppointments();
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <header className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-light text-slate-900">Olá, Cliente</h1>
        <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 text-slate-500 hover:text-red-500">
          <LogOut size={18} /> Sair
        </button>
      </header>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Lado Esquerdo: Agendar */}
        <div>
          <h2 className="text-xl font-medium mb-6 flex items-center gap-2">
            <Calendar size={20} /> Novo Agendamento
          </h2>
          
          <input 
            type="date" 
            className="w-full p-3 border border-slate-200 rounded-xl mb-6 bg-white"
            onChange={(e) => setDate(e.target.value)}
          />

          <div className="grid grid-cols-3 gap-3">
            {timeSlots.map(time => (
              <button
                key={time}
                onClick={() => handleBook(time)}
                className="py-2 px-4 bg-white border border-slate-200 rounded-lg hover:bg-slate-900 hover:text-white transition-all text-sm font-medium shadow-sm"
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        {/* Lado Direito: Meus Agendamentos */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
          <h2 className="text-xl font-medium mb-6 flex items-center gap-2">
            <Clock size={20} /> Meus Horários
          </h2>
          <div className="space-y-3">
            {myAppointments.length === 0 && <p className="text-slate-400 text-sm">Nenhum agendamento.</p>}
            {myAppointments.map(app => (
              <div key={app.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                  <p className="font-semibold text-slate-700">
                    {format(new Date(app.date_time), 'dd/MM/yyyy')}
                  </p>
                  <p className="text-sm text-slate-500">
                    às {format(new Date(app.date_time), 'HH:mm')}
                  </p>
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full uppercase">
                  {app.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}