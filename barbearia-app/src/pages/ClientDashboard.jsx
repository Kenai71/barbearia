import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Clock, LogOut, Scissors, User, Trash2, AlertTriangle, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ArrowLeft, Check, Lock, Loader2 } from 'lucide-react';
import { format, parseISO, addMinutes, setHours, setMinutes, isBefore, addDays, startOfDay, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay, isToday, isAfter, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SERVICES_LIST = [
  { id: 'nevou', label: 'Nevou', price: 70 },
  { id: 'reflexo', label: 'Reflexo ou Luzes', price: 80 },
  { id: 'corte_todo', label: 'Corte todo por um', price: 20 },
  { id: 'corte_disfarcado', label: 'Corte Disfarçado', price: 25 },
  { id: 'pe', label: 'Pé de Cabelo', price: 10 },
  { id: 'barba', label: 'Barba', price: 15 },
  { id: 'sombrancelha', label: 'Sobrancelha', price: 5 },
  { id: 'pigmentacao', label: 'Pigmentação', price: 15 },
];

export default function ClientDashboard({ session }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [barbers, setBarbers] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [occupiedSlots, setOccupiedSlots] = useState([]); 
  const [loading, setLoading] = useState(false);
  
  const [schedule, setSchedule] = useState({});
  const [overrides, setOverrides] = useState({});
  const [generatedSlots, setGeneratedSlots] = useState([]);

  // Estados dos Modais
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);

  // Estado do Modal de Serviços
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [tempSlot, setTempSlot] = useState(null); 
  const [selectedServices, setSelectedServices] = useState([]);

  // --- NOVO: Estado para Troca de Senha ---
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loadingPass, setLoadingPass] = useState(false);

  const today = new Date();
  const maxDate = addMonths(today, 1);

  // Carrega tema
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Carrega dados iniciais
  useEffect(() => {
    const fetchData = async () => {
      const { data: barberList } = await supabase.from('profiles').select('*').eq('role', 'barber');
      setBarbers(barberList || []);

      const { data: config } = await supabase.from('barbershop_settings').select('schedule, date_overrides').maybeSingle();
      if (config) {
        setSchedule(config.schedule || {});
        setOverrides(config.date_overrides || {});
      }
      
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

  const getDayConfig = (date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    if (overrides[dateKey]) return overrides[dateKey];
    const dayOfWeek = getDay(date);
    return schedule[dayOfWeek] || { active: false };
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const nextMonth = () => {
    const next = addMonths(currentMonth, 1);
    if (!isAfter(startOfMonth(next), maxDate)) {
      setCurrentMonth(next);
    }
  };
  
  const prevMonth = () => {
    if (!isBefore(endOfMonth(subMonths(currentMonth, 1)), startOfMonth(today))) {
      setCurrentMonth(subMonths(currentMonth, 1));
    }
  };

  const isNextDisabled = isAfter(startOfMonth(addMonths(currentMonth, 1)), maxDate);

  // --- GERAÇÃO DOS SLOTS ---
  useEffect(() => {
    setGeneratedSlots([]);
    if (!selectedDate) return;

    const config = getDayConfig(selectedDate);
    if (!config.active) return;

    const slots = [];
    const [openH, openM] = config.start.split(':').map(Number);
    const [closeH, closeM] = config.end.split(':').map(Number);

    const baseDate = startOfDay(selectedDate);
    let startTime = setMinutes(setHours(baseDate, openH), openM);
    let endTime = setMinutes(setHours(baseDate, closeH), closeM);

    if (isBefore(endTime, startTime) || (openH === closeH && openM === closeM)) {
      endTime = addDays(endTime, 1);
    }

    let current = startTime;
    const now = new Date(); 

    while (isBefore(current, endTime)) {
      if (!isToday(selectedDate) || isBefore(now, current)) {
        slots.push({
          label: format(current, 'HH:mm'),
          fullDate: current.toISOString(),
          compareKey: format(current, 'yyyy-MM-dd HH:mm') 
        });
      }
      current = addMinutes(current, 30);
    }
    setGeneratedSlots(slots);
  }, [selectedDate, schedule, overrides]);

  // --- BUSCA OCUPADOS ---
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDate || !selectedBarber) return;
      
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const startFilter = `${dateStr}T00:00:00`;
      const nextDay = addDays(selectedDate, 2).toISOString().split('T')[0]; 
      const endFilter = `${nextDay}T23:59:59`;

      const { data } = await supabase
        .from('appointments')
        .select('date_time')
        .eq('barber_id', selectedBarber)
        .gte('date_time', startFilter)
        .lte('date_time', endFilter);

      if (data) {
        setOccupiedSlots(data.map(app => format(new Date(app.date_time), 'yyyy-MM-dd HH:mm')));
      }
    };
    
    setOccupiedSlots([]);
    fetchSlots();
  }, [selectedDate, selectedBarber]);

  const handleSlotClick = (slotObj) => {
    if (!selectedBarber) return alert('Selecione um barbeiro.');
    setTempSlot(slotObj);
    setSelectedServices([]); 
    setShowServiceModal(true);
  };

  const toggleService = (serviceId) => {
    if (selectedServices.includes(serviceId)) {
      setSelectedServices(selectedServices.filter(id => id !== serviceId));
    } else {
      setSelectedServices([...selectedServices, serviceId]);
    }
  };

  const totalPrice = selectedServices.reduce((acc, id) => {
    const service = SERVICES_LIST.find(s => s.id === id);
    return acc + (service ? service.price : 0);
  }, 0);

  const handleConfirmBooking = async () => {
    setLoading(true);
    
    const servicesToSave = selectedServices.map(id => SERVICES_LIST.find(s => s.id === id));

    const { error } = await supabase.from('appointments').insert([{ 
        client_id: session.user.id, 
        barber_id: selectedBarber,
        date_time: tempSlot.fullDate, 
        status: 'pending',
        services: servicesToSave,
        total_price: totalPrice
    }]);

    if (error) alert('Erro: ' + error.message);
    else {
      alert('Agendado com sucesso!');
      fetchMyAppointments();
      setOccupiedSlots(prev => [...prev, tempSlot.compareKey]);
      setShowServiceModal(false); 
    }
    setLoading(false);
  };

  const requestCancel = (appointment) => {
    setAppointmentToCancel(appointment);
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    if (!appointmentToCancel) return;
    await supabase.from('appointments').delete().eq('id', appointmentToCancel.id);
    fetchMyAppointments();
    if (selectedBarber && appointmentToCancel.barber_id === selectedBarber) {
       const appKey = format(new Date(appointmentToCancel.date_time), 'yyyy-MM-dd HH:mm');
       setOccupiedSlots(prev => prev.filter(key => key !== appKey));
    }
    setShowCancelModal(false);
  };

  // --- FUNÇÃO DE TROCAR SENHA ---
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      alert('As senhas não conferem.');
      return;
    }
    if (newPassword.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoadingPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      alert('Erro ao atualizar senha: ' + error.message);
    } else {
      alert('Senha atualizada com sucesso!');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmNewPassword('');
    }
    setLoadingPass(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 font-sans">
      
      {/* MODAL TROCAR SENHA */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 border dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 text-center">Nova Senha</h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <input 
                type="password" 
                placeholder="Nova Senha" 
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl dark:text-white outline-none focus:border-blue-500"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
              <input 
                type="password" 
                placeholder="Confirmar Senha" 
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl dark:text-white outline-none focus:border-blue-500"
                value={confirmNewPassword}
                onChange={e => setConfirmNewPassword(e.target.value)}
                required
              />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 dark:text-white font-bold hover:bg-slate-200 transition">Cancelar</button>
                <button type="submit" disabled={loadingPass} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg transition flex justify-center">
                  {loadingPass ? <Loader2 className="animate-spin" /> : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CANCELAMENTO */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center border dark:border-slate-700">
             <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} />
            </div>
            <h3 className="text-xl font-bold dark:text-white mb-2">Cancelar?</h3>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 dark:text-white font-bold">Voltar</button>
              <button onClick={confirmCancel} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold shadow-lg shadow-red-600/20">Sim</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SERVIÇOS */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50">
              <button onClick={() => setShowServiceModal(false)} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                <ArrowLeft className="text-slate-600 dark:text-white" size={24} />
              </button>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Escolha os Serviços</h3>
                <p className="text-xs text-slate-500 font-medium">Selecione um ou mais</p>
              </div>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-3">
                {SERVICES_LIST.map((service) => {
                  const isSelected = selectedServices.includes(service.id);
                  return (
                    <button
                      key={service.id}
                      onClick={() => toggleService(service.id)}
                      className={`w-full flex justify-between items-center p-4 rounded-xl border-2 transition-all group
                        ${isSelected 
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500' 
                          : 'border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-slate-600'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                          ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-500'}`}>
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>
                        <span className={`font-bold text-sm ${isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-slate-700 dark:text-slate-300'}`}>
                          {service.label}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        R$ {service.price}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-500 font-medium">Total estimado</span>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  R$ {totalPrice}
                </span>
              </div>
              <button 
                onClick={handleConfirmBooking}
                disabled={selectedServices.length === 0 || loading}
                className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Confirmando...' : 'Confirmar Agendamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 shadow-sm/50 backdrop-blur-md bg-white/80 dark:bg-slate-800/80">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xl tracking-tight">
            <Scissors className="text-blue-600" /> BarberPro
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowPasswordModal(true)} 
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors"
              title="Alterar Senha"
            >
              <Lock size={20} />
            </button>
            <button onClick={() => supabase.auth.signOut()} className="text-slate-400 hover:text-red-500 transition-colors"><LogOut size={20} /></button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-2">
                <CalendarIcon className="text-blue-600" /> Novo Agendamento
              </h2>
              
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
                    </button>
                  ))}
                </div>
              </div>

              <div className={`mb-8 transition-all duration-500 ${!selectedBarber ? 'opacity-40 pointer-events-none grayscale' : 'opacity-100'}`}>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">2. Selecione a Data</label>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-4">
                    <button onClick={prevMonth} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><ChevronLeft size={20} className="dark:text-white"/></button>
                    <span className="font-bold text-slate-800 dark:text-white capitalize">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</span>
                    <button onClick={nextMonth} disabled={isNextDisabled} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full disabled:opacity-30 disabled:cursor-not-allowed text-slate-800 dark:text-white">
                      <ChevronRight size={20}/>
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 sm:gap-2">
                    {['D','S','T','Q','Q','S','S'].map((d, i) => <div key={i} className="text-center text-xs font-bold text-slate-400 py-2">{d}</div>)}
                    {Array.from({ length: getDay(startOfMonth(currentMonth)) }).map((_, i) => <div key={`e-${i}`} />)}
                    {daysInMonth.map((date) => {
                      const config = getDayConfig(date);
                      const isWorkDay = config.active;
                      const isPast = isBefore(date, startOfDay(today));
                      const isTooFar = isAfter(startOfDay(date), endOfDay(maxDate));
                      const isSelected = selectedDate && isSameDay(date, selectedDate);
                      return (
                        <button
                          key={date.toString()}
                          disabled={!isWorkDay || isPast || isTooFar}
                          onClick={() => setSelectedDate(date)}
                          className={`
                            aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all relative
                            ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105 z-10' : ''}
                            ${!isSelected && isWorkDay && !isPast && !isTooFar ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-400 border-2 border-transparent' : ''}
                            ${(!isWorkDay || isPast || isTooFar) ? 'bg-slate-100 dark:bg-slate-900/50 text-slate-300 dark:text-slate-700 cursor-not-allowed border-none' : ''}
                            ${!isWorkDay && !isPast && !isTooFar ? 'bg-red-50 dark:bg-red-900/10 text-red-300 dark:text-red-900' : ''}
                          `}
                        >
                          {format(date, 'd')}
                          {!isWorkDay && !isPast && !isTooFar && <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1"></div>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* HORÁRIOS */}
              <div className={`transition-all duration-500 ${!selectedDate ? 'opacity-40 pointer-events-none grayscale' : 'opacity-100'}`}>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">3. Horários para {selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</label>
                {generatedSlots.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">Nenhum horário disponível.</div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                    {generatedSlots.map((slot, index) => {
                      const isTaken = occupiedSlots.includes(slot.compareKey);
                      return (
                        <button
                          key={index}
                          disabled={loading || isTaken}
                          onClick={() => handleSlotClick(slot)}
                          className={`
                            py-3 rounded-xl text-sm font-bold transition-all relative overflow-hidden
                            ${isTaken 
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-60 line-through decoration-slate-400' 
                              : 'bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-white hover:border-blue-500 hover:text-blue-600'
                            }
                          `}
                        >
                          {slot.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
             <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700 sticky top-24">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4">Seus Agendamentos</h3>
                <div className="space-y-3">
                  {myAppointments.map(app => (
                    <div key={app.id} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-slate-800 dark:text-white">{format(new Date(app.date_time), "dd/MM 'as' HH:mm")}</span>
                        <button onClick={() => requestCancel(app)} className="text-red-500"><Trash2 size={16}/></button>
                      </div>
                      <div className="text-xs text-slate-500 flex justify-between">
                        <span>{app.profiles?.full_name}</span>
                        {app.total_price > 0 && <span className="font-bold text-blue-600">R$ {app.total_price}</span>}
                      </div>
                    </div>
                  ))}
                  {myAppointments.length === 0 && <p className="text-slate-400 text-sm">Nada agendado.</p>}
                </div>
             </div>
          </div>

        </div>
      </main>
    </div>
  );
}