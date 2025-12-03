import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, Clock, LogOut, Scissors, User, MapPin, CheckCircle, Hourglass, Moon, Sun, Trash2, AlertCircle, X } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ClientDashboard({ session }) {
  const [date, setDate] = useState('');
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [barbers, setBarbers] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [occupiedSlots, setOccupiedSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  
  // Estados do Modal de Cancelamento
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  const generateTimeSlots = () => {
    const slots = [];
    let startHour = 9;
    const endHour = 19;
    for (let hour = startHour; hour < endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    slots.push(`${endHour}:00`);
    return slots;
  };

  const timeSlots = generateTimeSlots();

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
    const fetchInitialData = async () => {
      const { data: userData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(userData);
      const { data: barbersData } = await supabase.from('profiles').select('*').eq('role', 'barber');
      setBarbers(barbersData || []);
    };
    fetchInitialData();
    fetchMyAppointments();
  }, [session.user.id]);

  const fetchMyAppointments = async () => {
    const { data } = await supabase
      .from('appointments')
      .select('*, profiles:barber_id(full_name)')
      .eq('client_id', session.user.id)
      .order('date_time', { ascending: true });
    setMyAppointments(data || []);
  };

  const fetchOccupiedSlots = async (targetDate, barberId) => {
    if (!targetDate || !barberId) return;
    const startDate = new Date(`${targetDate}T00:00:00`);
    const endDate = new Date(`${targetDate}T23:59:59`);
    const { data } = await supabase
      .from('appointments')
      .select('date_time')
      .eq('barber_id', barberId)
      .gte('date_time', startDate.toISOString())
      .lte('date_time', endDate.toISOString());
    if (data) {
      const busyTimes = data.map(app => format(new Date(app.date_time), 'HH:mm'));
      setOccupiedSlots(busyTimes);
    }
  };

  useEffect(() => {
    if (date && selectedBarber) {
      setOccupiedSlots([]);
      fetchOccupiedSlots(date, selectedBarber);
    }
  }, [date, selectedBarber]);

  const handleBook = async (time) => {
    if (!selectedBarber) return alert('Selecione um barbeiro primeiro.');
    if (!date) return alert('Selecione uma data.');
    setLoading(true);
    const dateTime = new Date(`${date}T${time}:00`);
    const { error } = await supabase.from('appointments').insert([
      { client_id: session.user.id, barber_id: selectedBarber, date_time: dateTime.toISOString(), status: 'pending' }
    ]);
    if (error) alert('Erro: ' + error.message);
    else {
      alert('Agendamento realizado!');
      fetchMyAppointments();
      fetchOccupiedSlots(date, selectedBarber);
    }
    setLoading(false);
  };

  // 1. Abertura do Modal (Verifica a hora)
  const requestCancellation = (appointment) => {
    const appointmentDate = new Date(appointment.date_time);
    const now = new Date();
    const hoursDifference = differenceInHours(appointmentDate, now);

    if (hoursDifference < 5) {
      return alert('Cancelamento não permitido. Faltam menos de 5 horas para o corte.');
    }

    // Se passou na regra das 5h, abre o modal
    setAppointmentToCancel(appointment);
    setShowCancelModal(true);
  };

  // 2. Confirmação (Ação real de deletar)
  const confirmCancellation = async () => {
    if (!appointmentToCancel) return;

    const { error } = await supabase.from('appointments').delete().eq('id', appointmentToCancel.id);
    
    if (error) {
      alert('Erro ao cancelar: ' + error.message);
    } else {
      // Sucesso
      fetchMyAppointments();
      if (date && selectedBarber) fetchOccupiedSlots(date, selectedBarber);
    }
    
    // Fecha o modal e limpa o estado
    setShowCancelModal(false);
    setAppointmentToCancel(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 font-sans relative">
      
      {/* --- MODAL DE CONFIRMAÇÃO --- */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 md:p-8 transform transition-all scale-100 border border-slate-100 dark:border-slate-700">
            
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mb-4">
                <AlertCircle size={32} />
              </div>
              
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Cancelar Reserva?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Tem certeza que deseja cancelar seu corte? Essa ação não pode ser desfeita e o horário ficará livre para outros.
              </p>

              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Não, Voltar
                </button>
                <button 
                  onClick={confirmCancellation}
                  className="flex-1 py-3 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all transform hover:-translate-y-0.5"
                >
                  Sim, Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <div className="bg-slate-900 dark:bg-blue-600 p-2 rounded-lg text-white"><Scissors size={20} /></div>
            <span className="font-bold text-xl tracking-tight">BarberPro</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-yellow-400">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="hidden md:flex items-center gap-3 text-right">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{profile?.full_name}</p>
              <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center"><User size={20} className="text-slate-500 dark:text-slate-300"/></div>
            </div>
            <button onClick={() => supabase.auth.signOut()} className="text-slate-400 hover:text-red-600"><LogOut size={20} /></button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* ESQUERDA: Agendamento */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Novo Agendamento</h2>
              
              {/* 1. Selecionar Barbeiro */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">1. Escolha o Profissional</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {barbers.map(barber => (
                    <button
                      key={barber.id}
                      onClick={() => setSelectedBarber(barber.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col gap-2
                        ${selectedBarber === barber.id 
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500' 
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'}`}
                    >
                      <span className="font-bold text-slate-900 dark:text-white">{barber.full_name}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Barbeiro</span>
                    </button>
                  ))}
                </div>
                {barbers.length === 0 && <p className="text-sm text-slate-500">Nenhum barbeiro cadastrado.</p>}
              </div>

              {/* 2. Selecionar Data */}
              <div className={`mb-6 transition-opacity ${!selectedBarber ? 'opacity-50 pointer-events-none' : ''}`}>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">2. Escolha a Data</label>
                <input 
                  type="date" 
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-700 dark:text-white dark:calendar-invert focus:ring-2 focus:ring-blue-500 outline-none"
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              {/* 3. Selecionar Horário */}
              <div className={`transition-opacity ${!date ? 'opacity-50 pointer-events-none' : ''}`}>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  3. Escolha o Horário {date && <span className="font-normal text-slate-400">- {format(new Date(date), "dd/MM/yyyy")}</span>}
                </label>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {timeSlots.map(time => {
                    const isTaken = occupiedSlots.includes(time);
                    return (
                      <button
                        key={time}
                        disabled={loading || isTaken}
                        onClick={() => handleBook(time)}
                        className={`
                          py-3 px-4 rounded-xl text-sm font-semibold transition-all relative overflow-hidden border
                          ${isTaken 
                            ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-900 dark:hover:bg-blue-600 hover:text-white hover:border-slate-900'
                          }
                        `}
                      >
                        {time}
                        {isTaken && <span className="absolute inset-0 flex items-center justify-center bg-slate-200/50 dark:bg-slate-900/50"><span className="w-full h-[1px] bg-slate-400 rotate-45 absolute"></span></span>}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* DIREITA: Meus Agendamentos */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 h-full transition-colors">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Seus Cortes</h3>
              
              <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                {myAppointments.length === 0 && <p className="text-center text-slate-400 py-10">Sem agendamentos.</p>}

                {myAppointments.map(app => (
                  <div key={app.id} className="p-5 rounded-2xl bg-white dark:bg-slate-750 border border-slate-100 dark:border-slate-700 shadow-sm relative group">
                    
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white">{format(new Date(app.date_time), 'dd/MM')}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold mt-1">{format(new Date(app.date_time), 'EEEE', { locale: ptBR })}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {app.status === 'pending' ? 'Pendente' : 'Confirmado'}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300 mb-4">
                      <div className="flex items-center gap-2"><Clock size={14}/> {format(new Date(app.date_time), 'HH:mm')}</div>
                      <div className="flex items-center gap-2"><User size={14}/> {app.profiles?.full_name || 'Barbeiro'}</div>
                    </div>

                    {/* Botão Abre o Modal */}
                    <button 
                      onClick={() => requestCancellation(app)}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/20 text-xs font-bold transition-colors"
                    >
                      <Trash2 size={14} /> Cancelar Reserva
                    </button>
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