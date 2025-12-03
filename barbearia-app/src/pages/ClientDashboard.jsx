import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, Clock, LogOut, Scissors, User, MapPin, CheckCircle, Hourglass } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ClientDashboard({ session }) {
  const [date, setDate] = useState('');
  const [myAppointments, setMyAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);

  const timeSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

  useEffect(() => {
    const getProfile = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(data);
    };
    getProfile();
    fetchMyAppointments();
  }, [session.user.id]);

  const fetchMyAppointments = async () => {
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('client_id', session.user.id)
      .order('date_time', { ascending: true });
    setMyAppointments(data || []);
  };

  const handleBook = async (time) => {
    if (!date) return alert('Por favor, selecione uma data no calendário.');
    setLoading(true);
    
    const dateTime = new Date(`${date}T${time}:00`);
    const { error } = await supabase.from('appointments').insert([
      { client_id: session.user.id, date_time: dateTime.toISOString(), status: 'pending' }
    ]);

    if (error) alert('Erro: ' + error.message);
    else {
      alert('Agendamento solicitado com sucesso!');
      fetchMyAppointments();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navbar Premium */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-900">
            <div className="bg-slate-900 p-2 rounded-lg text-white"><Scissors size={20} /></div>
            <span className="font-bold text-xl tracking-tight">BarberPro</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-3 text-right">
              <div>
                <p className="text-sm font-bold">{profile?.full_name || 'Visitante'}</p>
                <p className="text-xs text-slate-500">Cliente Vip</p>
              </div>
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 border border-slate-200">
                <User size={20} />
              </div>
            </div>
            <button onClick={() => supabase.auth.signOut()} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* SEÇÃO PRINCIPAL: Agendar */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                  <Calendar size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Novo Agendamento</h2>
                  <p className="text-slate-500 text-sm">Escolha o dia e o horário perfeito para você.</p>
                </div>
              </div>

              {/* Input de Data Estilizado */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-slate-700 mb-3">Escolha a Data</label>
                <input 
                  type="date" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium transition-all hover:bg-slate-100 cursor-pointer"
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              {/* Grid de Horários */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Horários Disponíveis</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {timeSlots.map(time => (
                    <button
                      key={time}
                      disabled={loading}
                      onClick={() => handleBook(time)}
                      className="group py-3 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 hover:shadow-lg transition-all duration-200 active:scale-95 disabled:opacity-50"
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Card de Promoção (Visual) */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
              <div className="relative z-10 max-w-md">
                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm">PROMOÇÃO</span>
                <h3 className="text-2xl font-bold mt-4 mb-2">Corte + Barba Premium</h3>
                <p className="text-slate-300 text-sm mb-6">Agende nas terças e ganhe 20% de desconto e uma bebida grátis.</p>
                <button className="bg-white text-slate-900 text-sm font-bold px-6 py-3 rounded-xl hover:bg-slate-100 transition-colors">
                  Saber mais
                </button>
              </div>
              <Scissors className="absolute -right-6 -bottom-6 text-white/5 w-48 h-48 rotate-12" />
            </div>
          </div>

          {/* BARRA LATERAL: Meus Agendamentos */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">Seus Cortes</h3>
                <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">
                  {myAppointments.length} agendados
                </div>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {myAppointments.length === 0 && (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Clock size={32} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-400 text-sm font-medium">Sem agendamentos futuros</p>
                  </div>
                )}

                {myAppointments.map(app => (
                  <div key={app.id} className="relative p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                    {/* Indicador lateral de status */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${app.status === 'pending' ? 'bg-yellow-400' : 'bg-green-500'}`}></div>
                    
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-3xl font-bold text-slate-800 leading-none">{format(new Date(app.date_time), 'dd')}</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
                          {format(new Date(app.date_time), 'MMM', { locale: ptBR })}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide flex items-center gap-1
                        ${app.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                        {app.status === 'pending' ? <Hourglass size={10} /> : <CheckCircle size={10} />}
                        {app.status === 'pending' ? 'Pendente' : 'Confirmado'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-slate-600 text-sm font-semibold bg-slate-50 p-2 rounded-lg">
                      <Clock size={16} className="text-slate-400" />
                      {format(new Date(app.date_time), 'HH:mm')}
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                      <MapPin size={12} />
                      Unidade Centro
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}