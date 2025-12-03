import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, Clock, LogOut, Scissors, User, MapPin, CheckCircle, Hourglass, Moon, Sun, Trash2, AlertTriangle, X } from 'lucide-react';
import { format, differenceInHours, isBefore, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ClientDashboard({ session }) {
  const [date, setDate] = useState('');
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [barbers, setBarbers] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [occupiedSlots, setOccupiedSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);

  // Modal de Cancelamento
  const [showModal, setShowModal] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  // Gera horários: 09:00 as 19:00 (30 em 30 min)
  const timeSlots = [];
  for (let i = 9; i < 19; i++) {
    timeSlots.push(`${i.toString().padStart(2, '0')}:00`);
    timeSlots.push(`${i.toString().padStart(2, '0')}:30`);
  }
  timeSlots.push('19:00');

  // Configuração do Tema
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Carrega dados iniciais
  useEffect(() => {
    const fetchData = async () => {
      // Perfil do usuário
      const { data: user } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(user);

      // Lista de Barbeiros
      const { data: barberList } = await supabase.from('profiles').select('*').eq('role', 'barber');
      setBarbers(barberList || []);
      
      fetchMyAppointments();
    };
    fetchData();
  }, [session.user.id]);

  const fetchMyAppointments = async () => {
    const { data } = await supabase
      .from('appointments')
      .select('*, profiles:barber_id(full_name)') // Traz o nome do barbeiro
      .eq('client_id', session.user.id)
      .order('date_time', { ascending: true });
    setMyAppointments(data || []);
  };

  // Busca horários ocupados do barbeiro específico
  useEffect(() => {
    const fetchSlots = async () => {
      if (!date || !selectedBarber) return;
      
      const start = `${date}T00:00:00`;
      const end = `${date}T23:59:59`;

      const { data } = await supabase
        .from('appointments')
        .select('date_time')
        .eq('barber_id', selectedBarber) // Filtra pelo barbeiro
        .gte('date_time', start)
        .lte('date_time', end);

      if (data) {
        setOccupiedSlots(data.map(app => format(new Date(app.date_time), 'HH:mm')));
      }
    };
    
    setOccupiedSlots([]);
    fetchSlots();
  }, [date, selectedBarber]);

  const handleBook = async (time) => {
    if (!selectedBarber) return alert('Selecione um barbeiro.');
    if (!date) return alert('Selecione uma data.');
    
    setLoading(true);
    const dateTime = new Date(`${date}T${time}:00`);

    const { error } = await supabase.from('appointments').insert([
      { 
        client_id: session.user.id, 
        barber_id: selectedBarber,
        date_time: dateTime.toISOString(), 
        status: 'pending' 
      }
    ]);

    if (error) alert('Erro: ' + error.message);
    else {
      alert('Agendado com sucesso!');
      fetchMyAppointments();
      // Recarrega os slots para bloquear o que acabou de ser agendado
      const newOccupied = [...occupiedSlots, time];
      setOccupiedSlots(newOccupied);
    }
    setLoading(false);
  };

  // Tenta cancelar (Verifica regra de 5h)
  const requestCancel = (appointment) => {
    const appDate = new Date(appointment.date_time);
    const now = new Date();
    const hoursLeft = differenceInHours(appDate, now);

    if (hoursLeft < 5) {
      alert(`Não é possível cancelar. Faltam apenas ${hoursLeft} horas para o corte (mínimo 5h).`);
      return;
    }

    setAppointmentToCancel(appointment);
    setShowModal(true);
  };

  // Confirma cancelamento
  const confirmCancel = async () => {
    if (!appointmentToCancel) return;

    const { error } = await supabase.from('appointments').delete().eq('id', appointmentToCancel.id);
    
    if (error) alert('Erro ao cancelar.');
    else {
      fetchMyAppointments();
      // Se o cancelamento for no dia que estou vendo, libera o horário visualmente
      if (date && selectedBarber && appointmentToCancel.barber_id === selectedBarber) {
         const time = format(new Date(appointmentToCancel.date_time), 'HH:mm');
         setOccupiedSlots(prev => prev.filter(t => t !== time));
      }
    }
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 font-sans relative">
      
      {/* MODAL DE CANCELAMENTO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center border border-slate-200 dark:border-slate-700">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Cancelar Agendamento?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              O horário será liberado para outros clientes. Essa ação é irreversível.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white font-medium hover:bg-slate-200 transition-colors"
              >
                Voltar
              </button>
              <button 
                onClick={confirmCancel}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
              >
                Sim, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xl">
            <Scissors className="text-blue-600" /> BarberPro
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-yellow-400">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="hidden md:block text-right">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{profile?.full_name}</p>
            </div>
            <button onClick={() => supabase.auth.signOut()} className="text-slate-400 hover:text-red-500"><LogOut size={20} /></button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* AGENDAMENTO */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Novo Agendamento</h2>
              
              {/* 1. Barbeiros */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">1. Escolha o Profissional</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {barbers.map(barber => (
                    <button
                      key={barber.id}
                      onClick={() => setSelectedBarber(barber.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all
                        ${selectedBarber === barber.id 
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500' 
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'}`}
                    >
                      <span className="block font-bold text-slate-900 dark:text-white">{barber.full_name}</span>
                      <span className="text-xs text-slate-500">Barbeiro</span>
                    </button>
                  ))}
                </div>
                {barbers.length === 0 && <p className="text-slate-500 text-sm">Nenhum barbeiro disponível.</p>}
              </div>

              {/* 2. Data e Horários (Só aparece se escolheu barbeiro) */}
              <div className={`space-y-6 transition-opacity duration-500 ${!selectedBarber ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">2. Escolha a Data</label>
                  <input 
                    type="date" 
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white dark:calendar-invert outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">3. Escolha o Horário</label>
                  {!date ? (
                    <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400">
                      Selecione uma data primeiro.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {timeSlots.map(time => {
                        const isTaken = occupiedSlots.includes(time);
                        return (
                          <button
                            key={time}
                            disabled={loading || isTaken}
                            onClick={() => handleBook(time)}
                            className={`
                              py-2 px-2 rounded-lg text-sm font-bold transition-all border
                              ${isTaken 
                                ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-400 cursor-not-allowed line-through opacity-70' 
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-white hover:bg-slate-900 dark:hover:bg-blue-600 hover:text-white hover:border-slate-900'
                              }
                            `}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* MEUS AGENDAMENTOS */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 h-full">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Seus Cortes</h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                {myAppointments.length === 0 && <p className="text-slate-400 text-center py-8">Nenhum agendamento.</p>}
                
                {myAppointments.map(app => (
                  <div key={app.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="block text-xl font-bold text-slate-900 dark:text-white">
                          {format(new Date(app.date_time), 'dd/MM')}
                        </span>
                        <span className="text-xs text-slate-500 uppercase font-bold">
                          {format(new Date(app.date_time), 'EEEE', { locale: ptBR })}
                        </span>
                      </div>
                      <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {app.status === 'pending' ? 'Pendente' : 'Confirmado'}
                      </span>
                    </div>
                    
                    <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1 mb-3">
                      <div className="flex items-center gap-2"><Clock size={14}/> {format(new Date(app.date_time), 'HH:mm')}</div>
                      <div className="flex items-center gap-2"><User size={14}/> {app.profiles?.full_name || 'Barbeiro'}</div>
                    </div>

                    <button 
                      onClick={() => requestCancel(app)}
                      className="w-full py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/20 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Trash2 size={14} /> Cancelar
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