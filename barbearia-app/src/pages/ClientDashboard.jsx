import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Clock, LogOut, Scissors, User, Trash2, AlertTriangle, Calendar as CalendarIcon, Moon, Sun } from 'lucide-react';
import { format, differenceInHours, parseISO, addMinutes, setHours, setMinutes, isBefore, addDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ClientDashboard({ session }) {
  const [date, setDate] = useState('');
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [barbers, setBarbers] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [occupiedSlots, setOccupiedSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [generatedSlots, setGeneratedSlots] = useState([]);

  // Modal Cancelamento
  const [showModal, setShowModal] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
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

  // Carrega dados iniciais e configurações
  useEffect(() => {
    const fetchData = async () => {
      const { data: user } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(user);

      const { data: barberList } = await supabase.from('profiles').select('*').eq('role', 'barber');
      setBarbers(barberList || []);

      const { data: config } = await supabase.from('barbershop_settings').select('*').single();
      setSettings(config);
      
      fetchMyAppointments();
    };
    fetchData();
  }, [session.user.id]);

  const fetchMyAppointments = async () => {
    const { data } = await supabase
      .from('appointments')
      .select('*, profiles:barber_id(full_name)')
      .eq('client_id', session.user.id)
      .order('date_time', { ascending: true });
    setMyAppointments(data || []);
  };

  // ----------------------------------------------------
  // NOVA LÓGICA DE GERAÇÃO DE HORÁRIOS (Suporta Madrugada)
  // ----------------------------------------------------
  useEffect(() => {
    if (!settings || !date) return;

    const selectedDate = parseISO(date);
    // Corrige o fuso horário pegando o startOfDay local
    const baseDate = startOfDay(selectedDate); 
    const dayOfWeek = baseDate.getDay(); // 0 = Dom, 1 = Seg

    // Verifica se a barbearia abre neste dia da semana
    if (!settings.work_days.includes(dayOfWeek)) {
      setGeneratedSlots([]); 
      return;
    }

    const slots = [];
    const [openH, openM] = settings.opening_time.split(':').map(Number);
    const [closeH, closeM] = settings.closing_time.split(':').map(Number);

    // Define data/hora de abertura
    let startTime = setMinutes(setHours(baseDate, openH), openM);
    
    // Define data/hora de fechamento
    let endTime = setMinutes(setHours(baseDate, closeH), closeM);

    // Se o horário de fechar for MENOR que o de abrir (ex: abre 23h, fecha 07h),
    // significa que fecha no dia seguinte. Adicionamos 1 dia ao endTime.
    if (isBefore(endTime, startTime) || (openH === closeH && openM === closeM)) {
      endTime = addDays(endTime, 1);
    }

    let current = startTime;
    // Loop de 30 em 30 minutos
    while (isBefore(current, endTime)) {
      // Guardamos o objeto Date completo para saber o dia exato (hoje ou amanhã)
      slots.push({
        label: format(current, 'HH:mm'),
        fullDate: current.toISOString() // Formato ISO para salvar no banco
      });
      current = addMinutes(current, 30);
    }
    setGeneratedSlots(slots);

  }, [date, settings]);

  // Busca horários ocupados (Considerando o intervalo real, incluindo dia seguinte se for o caso)
  useEffect(() => {
    const fetchSlots = async () => {
      if (!date || !selectedBarber || !settings) return;
      
      // Precisamos buscar agendamentos que cubram todo o turno possível (até o dia seguinte + 12h por segurança)
      const startFilter = `${date}T00:00:00`;
      const nextDay = addDays(parseISO(date), 2).toISOString().split('T')[0]; // Busca com margem
      const endFilter = `${nextDay}T23:59:59`;

      const { data } = await supabase
        .from('appointments')
        .select('date_time')
        .eq('barber_id', selectedBarber)
        .gte('date_time', startFilter)
        .lte('date_time', endFilter);

      if (data) {
        // Cria um array de strings ISO para facilitar a comparação
        setOccupiedSlots(data.map(app => new Date(app.date_time).toISOString()));
      }
    };
    
    setOccupiedSlots([]);
    fetchSlots();
  }, [date, selectedBarber, settings]);

  const handleBook = async (slotObj) => {
    if (!selectedBarber) return alert('Selecione um barbeiro.');
    
    setLoading(true);
    
    // Usa a data completa gerada na lógica dos slots (já considera se virou o dia)
    const dateTimeISO = slotObj.fullDate;

    const { error } = await supabase.from('appointments').insert([
      { 
        client_id: session.user.id, 
        barber_id: selectedBarber,
        date_time: dateTimeISO, 
        status: 'pending' 
      }
    ]);

    if (error) alert('Erro: ' + error.message);
    else {
      alert('Agendado com sucesso!');
      fetchMyAppointments();
      // Bloqueia visualmente o slot imediatamente
      setOccupiedSlots(prev => [...prev, dateTimeISO]);
    }
    setLoading(false);
  };

  const requestCancel = (appointment) => {
    const appDate = new Date(appointment.date_time);
    const now = new Date();
    const hoursLeft = differenceInHours(appDate, now);

    if (hoursLeft < 5) {
      alert(`Não é possível cancelar em cima da hora. Faltam ${hoursLeft} horas.`);
      return;
    }
    setAppointmentToCancel(appointment);
    setShowModal(true);
  };

  const confirmCancel = async () => {
    if (!appointmentToCancel) return;
    await supabase.from('appointments').delete().eq('id', appointmentToCancel.id);
    fetchMyAppointments();
    
    // Remove da lista de ocupados se for o barbeiro selecionado
    if (selectedBarber && appointmentToCancel.barber_id === selectedBarber) {
       const appIso = new Date(appointmentToCancel.date_time).toISOString();
       setOccupiedSlots(prev => prev.filter(iso => iso !== appIso));
    }
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 font-sans">
      
      {/* Modal Cancelamento */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center border dark:border-slate-700">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} />
            </div>
            <h3 className="text-xl font-bold dark:text-white mb-2">Cancelar?</h3>
            <p className="text-slate-500 mb-6 text-sm">Essa ação liberará o horário para outros clientes.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 dark:text-white font-bold">Voltar</button>
              <button onClick={confirmCancel} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold shadow-lg shadow-red-600/20">Sim, Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 shadow-sm/50 backdrop-blur-md bg-white/80 dark:bg-slate-800/80">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xl tracking-tight">
            <Scissors className="text-blue-600" /> BarberPro
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-yellow-400 transition-transform active:scale-95">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={() => supabase.auth.signOut()} className="text-slate-400 hover:text-red-500 transition-colors"><LogOut size={20} /></button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* PAINEL DE AGENDAMENTO */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-2">
                <CalendarIcon className="text-blue-600" /> Novo Agendamento
              </h2>
              
              {/* 1. Barbeiros */}
              <div className="mb-8">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">1. Profissional</label>
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                  {barbers.map(barber => (
                    <button
                      key={barber.id}
                      onClick={() => setSelectedBarber(barber.id)}
                      className={`min-w-[140px] p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 relative overflow-hidden group
                        ${selectedBarber === barber.id 
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500 transform scale-105 shadow-md' 
                          : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-blue-300'}`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm transition-colors
                        ${selectedBarber === barber.id ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-400'}`}>
                        {barber.full_name.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white text-sm truncate w-full text-center">{barber.full_name}</span>
                      {selectedBarber === barber.id && <div className="absolute top-2 right-2 w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Data */}
              <div className={`mb-8 transition-all duration-500 ${!selectedBarber ? 'opacity-40 pointer-events-none grayscale' : 'opacity-100'}`}>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">2. Data</label>
                <div className="relative">
                  <input 
                    type="date" 
                    className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl dark:text-white font-bold outline-none focus:border-blue-500 transition-all cursor-pointer dark:calendar-invert"
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                </div>
              </div>

              {/* 3. Horários */}
              <div className={`transition-all duration-500 ${!date ? 'opacity-40 pointer-events-none grayscale' : 'opacity-100'}`}>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">3. Horário Disponível</label>
                
                {generatedSlots.length === 0 ? (
                  <div className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center">
                    <p className="text-slate-500 font-medium">A barbearia está fechada neste dia ou você não selecionou uma data.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                    {generatedSlots.map((slot, index) => {
                      const isTaken = occupiedSlots.includes(slot.fullDate);
                      return (
                        <button
                          key={index}
                          disabled={loading || isTaken}
                          onClick={() => handleBook(slot)}
                          className={`
                            py-3 rounded-xl text-sm font-bold transition-all relative overflow-hidden group
                            ${isTaken 
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed border border-transparent' 
                              : 'bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-white hover:border-blue-500 hover:text-blue-600 hover:shadow-lg hover:shadow-blue-500/10 active:scale-95'
                            }
                          `}
                        >
                          {slot.label}
                          {isTaken && <div className="absolute inset-0 flex items-center justify-center bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-[1px]"><XIcon size={16}/></div>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* MEUS AGENDAMENTOS */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700 h-fit sticky top-24">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center justify-between">
                Seus Cortes
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">{myAppointments.length}</span>
              </h3>
              
              <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                {myAppointments.length === 0 && <p className="text-slate-400 text-center py-8 text-sm">Você ainda não tem cortes agendados.</p>}
                
                {myAppointments.map(app => (
                  <div key={app.id} className="group relative bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-900/50 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <span className="block text-lg font-bold text-slate-900 dark:text-white text-center leading-none">
                          {format(new Date(app.date_time), 'dd')}
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold text-center block mt-1">
                          {format(new Date(app.date_time), 'MMM', { locale: ptBR })}
                        </span>
                      </div>
                      <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border
                        ${app.status === 'pending' 
                          ? 'bg-yellow-50 border-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-900/30 dark:text-yellow-500' 
                          : 'bg-green-50 border-green-100 text-green-700 dark:bg-green-900/20 dark:border-green-900/30 dark:text-green-500'}`}>
                        {app.status === 'pending' ? 'Aguardando' : 'Confirmado'}
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-sm mb-1">
                        <Clock size={14} className="text-blue-500"/> {format(new Date(app.date_time), 'HH:mm')}
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <User size={14} /> {app.profiles?.full_name}
                      </div>
                    </div>

                    <button 
                      onClick={() => requestCancel(app)}
                      className="w-full py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-red-500 hover:border-red-200 text-xs font-bold transition-all flex items-center justify-center gap-2 group-hover:bg-red-50 dark:group-hover:bg-red-900/10 group-hover:border-red-200 dark:group-hover:border-red-900/30"
                    >
                      <Trash2 size={14} /> Cancelar Agendamento
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

const XIcon = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
)