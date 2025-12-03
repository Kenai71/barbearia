import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, Clock, LogOut, Scissors, User, MapPin, CheckCircle, Hourglass, Moon, Sun } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ClientDashboard({ session }) {
  const [date, setDate] = useState('');
  const [myAppointments, setMyAppointments] = useState([]);
  const [occupiedSlots, setOccupiedSlots] = useState([]); // Lista de horários ocupados
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  
  // Controle do Dark Mode
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  // Gerar horários de 30 em 30 minutos (09:00 as 19:00)
  const generateTimeSlots = () => {
    const slots = [];
    let startHour = 9;
    const endHour = 19;

    for (let hour = startHour; hour < endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    slots.push(`${endHour}:00`); // Inclui 19:00
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Aplica o tema
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
    const getProfile = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(data);
    };
    getProfile();
    fetchMyAppointments();
  }, [session.user.id]);

  // Busca MEUS agendamentos
  const fetchMyAppointments = async () => {
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('client_id', session.user.id)
      .order('date_time', { ascending: true });
    setMyAppointments(data || []);
  };

  // Busca horários OCUPADOS (de todo mundo)
  const fetchOccupiedSlots = async (selectedDate) => {
    if (!selectedDate) return;

    const startDate = new Date(`${selectedDate}T00:00:00`);
    const endDate = new Date(`${selectedDate}T23:59:59`);

    const { data } = await supabase
      .from('appointments')
      .select('date_time')
      .gte('date_time', startDate.toISOString())
      .lte('date_time', endDate.toISOString());

    if (data) {
      // Cria uma lista apenas com as horas ocupadas (ex: ["09:30", "14:00"])
      const busyTimes = data.map(app => format(new Date(app.date_time), 'HH:mm'));
      setOccupiedSlots(busyTimes);
    }
  };

  // Atualiza bloqueios quando muda a data
  useEffect(() => {
    if (date) {
      setOccupiedSlots([]); // Limpa enquanto carrega
      fetchOccupiedSlots(date);
    }
  }, [date]);

  const handleBook = async (time) => {
    if (!date) return alert('Por favor, selecione uma data no calendário.');
    if (occupiedSlots.includes(time)) return alert('Este horário já está ocupado.');
    
    setLoading(true);
    
    const dateTime = new Date(`${date}T${time}:00`);
    const { error } = await supabase.from('appointments').insert([
      { client_id: session.user.id, date_time: dateTime.toISOString(), status: 'pending' }
    ]);

    if (error) alert('Erro: ' + error.message);
    else {
      alert('Agendamento solicitado com sucesso!');
      fetchMyAppointments();
      fetchOccupiedSlots(date); // Atualiza visualmente o bloqueio
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 font-sans">
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <div className="bg-slate-900 dark:bg-blue-600 p-2 rounded-lg text-white transition-colors"><Scissors size={20} /></div>
            <span className="font-bold text-xl tracking-tight">BarberPro</span>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-yellow-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="hidden md:flex items-center gap-3 text-right">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{profile?.full_name || 'Visitante'}</p>
              </div>
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
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
          
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors duration-300">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                  <Calendar size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Novo Agendamento</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Escolha o dia e o horário perfeito.</p>
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Escolha a Data</label>
                <input 
                  type="date" 
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 dark:text-white font-medium transition-all hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer dark:calendar-invert"
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  Horários Disponíveis {date && <span className="font-normal text-slate-400">- {format(new Date(date), "dd/MM/yyyy")}</span>}
                </label>
                
                {!date ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400">
                    Selecione uma data acima para ver os horários.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {timeSlots.map(time => {
                      const isTaken = occupiedSlots.includes(time);
                      return (
                        <button
                          key={time}
                          disabled={loading || isTaken}
                          onClick={() => handleBook(time)}
                          className={`
                            group py-3 px-4 rounded-xl border text-sm font-semibold transition-all duration-200 relative overflow-hidden
                            ${isTaken 
                              ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed opacity-60' 
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-900 dark:hover:bg-blue-600 hover:text-white dark:hover:text-white hover:border-slate-900 dark:hover:border-blue-600 hover:shadow-lg active:scale-95'
                            }
                          `}
                        >
                          {time}
                          {isTaken && (
                            <span className="absolute inset-0 flex items-center justify-center bg-slate-200/50 dark:bg-slate-900/50 backdrop-blur-[1px]">
                              <span className="w-full h-[2px] bg-slate-400 rotate-45 absolute"></span>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 h-full transition-colors duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Seus Cortes</h3>
                <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold">
                  {myAppointments.length}
                </div>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {myAppointments.length === 0 && (
                  <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <Clock size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">Sem agendamentos futuros</p>
                  </div>
                )}

                {myAppointments.map(app => (
                  <div key={app.id} className="relative p-5 rounded-2xl bg-white dark:bg-slate-750 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${app.status === 'pending' ? 'bg-yellow-400' : 'bg-green-500'}`}></div>
                    
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-3xl font-bold text-slate-800 dark:text-white leading-none">{format(new Date(app.date_time), 'dd')}</p>
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">
                          {format(new Date(app.date_time), 'MMM', { locale: ptBR })}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide flex items-center gap-1
                        ${app.status === 'pending' 
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-900/30' 
                          : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/30'}`}>
                        {app.status === 'pending' ? <Hourglass size={10} /> : <CheckCircle size={10} />}
                        {app.status === 'pending' ? 'Pendente' : 'Confirmado'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm font-semibold bg-slate-50 dark:bg-slate-900 p-2 rounded-lg">
                      <Clock size={16} className="text-slate-400" />
                      {format(new Date(app.date_time), 'HH:mm')}
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
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