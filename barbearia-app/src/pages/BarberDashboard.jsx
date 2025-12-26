// src/pages/BarberDashboard.jsx

import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { CalendarCheck, LogOut, Check, X, Clock, CheckCircle, TrendingUp, Scissors, Settings, Wallet, UserX, UserPlus, Lock, Loader2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Bell } from 'lucide-react'; 
import { format, isToday, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay, isSameDay, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

// CHAVE VAPID PÚBLICA (COLOQUE SUA CHAVE AQUI)
const VAPID_PUBLIC_KEY = 'BKRWjdFVvU67xQmv0QXJAuq0fLOytQEHV9aEy9JyUI8iyrvnNd_qtqCWpjVwKSyWYFo4oHK0S_ZJ-tk4TM5P7fg'; 

// Converte a chave VAPID de Base64URL para UInt8Array
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export default function BarberDashboard({ session, isAdmin }) {
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({ total: 0, today: 0, pending: 0, revenue: 0 });
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  
  const [schedule, setSchedule] = useState({});
  const [overrides, setOverrides] = useState({});
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  
  const [showNoShowModal, setShowNoShowModal] = useState(false);
  const [appointmentToNoShow, setAppointmentToNoShow] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false); 
  const [showCalendarModal, setShowCalendarModal] = useState(false); 

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loadingPass, setLoadingPass] = useState(false);

  const [newAppointmentNotification, setNewAppointmentNotification] = useState(null);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false); 

  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || VAPID_PUBLIC_KEY === 'VAPID_PUBLIC_KEY_PLACEHOLDER') {
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    setIsPushSubscribed(!!subscription);
  };
  
  const subscribeUser = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Seu navegador não suporta notificações push.');
      return;
    }

    if (VAPID_PUBLIC_KEY === 'VAPID_PUBLIC_KEY_PLACEHOLDER') {
        alert('A chave VAPID pública não foi configurada. Fale com o administrador do sistema.');
        return;
    }

    if (Notification.permission === 'denied') {
        alert('Permissão de notificação negada. Você precisa resetá-la nas configurações do navegador.');
        return;
    }
    
    setLoadingPass(true); 
    try {
        const registration = await navigator.serviceWorker.ready;
        
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        // Salva a inscrição (Subscription JSON) no banco de dados
        const { error } = await supabase.from('barber_push_subscriptions').upsert({
            barber_id: session.user.id,
            subscription: subscription,
            // ID para o Supabase usar como chave de unicidade
            profile_id: session.user.id 
        }, { onConflict: 'profile_id' });

        if (error) throw error;

        setIsPushSubscribed(true);
        alert('Notificações ativadas com sucesso! Você receberá alertas mesmo com o site fechado.');
    } catch (error) {
        console.error('Erro na inscrição push:', error);
        alert('Falha ao se inscrever para notificações: ' + error.message);
    } finally {
        setLoadingPass(false);
    }
  };
  
  const unsubscribeUser = async () => {
    setLoadingPass(true);
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            await subscription.unsubscribe();
            // Remove a inscrição do banco de dados
            const { error } = await supabase.from('barber_push_subscriptions').delete().eq('barber_id', session.user.id);
            if (error) throw error;
        }

        setIsPushSubscribed(false);
        alert('Notificações desativadas.');
    } catch (error) {
        console.error('Erro ao cancelar inscrição:', error);
        alert('Falha ao cancelar inscrição: ' + error.message);
    } finally {
        setLoadingPass(false);
    }
  };


  useEffect(() => { 
    if (darkMode) { 
      document.documentElement.classList.add('dark'); 
    } else { 
      document.documentElement.classList.remove('dark'); 
    }
  }, [darkMode]); 

  useEffect(() => {
    fetchAppointments(); 
    fetchSettings(); 
    
    checkSubscription();

    const subscription = supabase
      .channel('appointments_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, (payload) => {
          
          // LÓGICA DE NOTIFICAÇÃO LOCAL PARA NOVOS AGENDAMENTOS (TOAST)
          if (payload.eventType === 'INSERT' && payload.new.barber_id === session.user.id) {
              supabase
                  .from('profiles')
                  .select('full_name')
                  .eq('id', payload.new.client_id)
                  .maybeSingle()
                  .then(({ data }) => {
                      const clientName = data?.full_name || 'Novo Cliente';
                      const appointmentDate = new Date(payload.new.date_time);
                      const appointmentTime = format(appointmentDate, 'HH:mm');
                      const appointmentDay = format(appointmentDate, "dd 'de' MMMM", { locale: ptBR });
                      
                      setNewAppointmentNotification({
                          clientName,
                          time: appointmentTime,
                          day: appointmentDay
                      });
                      
                      setTimeout(() => setNewAppointmentNotification(null), 7000);
                  });
          }
          // FIM DA LÓGICA DE NOTIFICAÇÃO LOCAL
          
          fetchAppointments(); 
      })
      .subscribe(); 
      
    return () => { supabase.removeChannel(subscription); }; 
  }, [session.user.id]);

  // Funções Auxiliares do Calendário
  const getDayConfig = (date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    if (overrides[dateKey]) return overrides[dateKey];
    const dayOfWeek = getDay(date);
    return schedule[dayOfWeek] || { active: false };
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(calendarMonth),
    end: endOfMonth(calendarMonth),
  });

  const fetchSettings = async () => {
    const { data } = await supabase.from('barbershop_settings').select('schedule, date_overrides').maybeSingle();
    if (data) {
      setSchedule(data.schedule || {});
      setOverrides(data.date_overrides || {});
    }
    setLoadingSettings(false);
  };

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select(`*, client:client_id(full_name, email), barber:barber_id(full_name)`)
      .order('date_time', { ascending: true });

    if (!error && data) {
      setAppointments(data);

      const myApps = data.filter(app => app.barber_id === session.user.id);
      
      const todayCount = myApps.filter(app => isToday(new Date(app.date_time))).length;
      const pendingCount = myApps.filter(app => app.status === 'pending').length;
      
      const activeCutsCount = myApps.filter(app => 
        app.status !== 'completed' && app.status !== 'cancelled'
      ).length;

      const totalRevenue = myApps
        .filter(app => app.status === 'completed')
        .reduce((acc, curr) => acc + (curr.total_price || 0), 0);

      setStats({ 
        total: activeCutsCount, 
        today: todayCount, 
        pending: pendingCount, 
        revenue: totalRevenue 
      });
    }
  };

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', id);
    if (error) alert('Erro: ' + error.message);
    else fetchAppointments();
  };

  const handleOpenNoShow = (appointment) => {
    setAppointmentToNoShow(appointment);
    setShowNoShowModal(true);
  };

  const confirmNoShow = async () => {
    if (appointmentToNoShow) {
      await updateStatus(appointmentToNoShow.id, 'cancelled');
      setShowNoShowModal(false);
      setAppointmentToNoShow(null);
    }
  };

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

  const myApps = appointments.filter(app => app.barber_id === session.user.id);
  
  const completedHistory = myApps.filter(app => app.status === 'completed');
  const activeAppointments = appointments.filter(app => app.status !== 'completed'); // Agenda Geral

  const selectedDayAppointments = selectedCalendarDate 
    ? myApps.filter(app => isSameDay(new Date(app.date_time), selectedCalendarDate))
    : [];
  
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-300 font-sans">
      
      {/* NOVO: NOTIFICAÇÃO DE NOVO AGENDAMENTO (TOAST LOCAL) */}
      {newAppointmentNotification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-right-10 duration-500">
          <div className="bg-green-600 text-white p-4 rounded-xl shadow-2xl flex items-center gap-3 max-w-sm">
            <CalendarCheck size={24} />
            <div>
              <p className="font-bold">Novo Agendamento Recebido!</p>
              <p className="text-sm">
                {newAppointmentNotification.clientName} | {newAppointmentNotification.day} às {newAppointmentNotification.time}
              </p>
            </div>
            <button onClick={() => setNewAppointmentNotification(null)} className="ml-2 text-white/80 hover:text-white">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

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

      {/* MODAL HISTÓRICO DE FATURAMENTO */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border dark:border-slate-700 flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Wallet className="text-green-600" size={20} /> Histórico de Faturamento
                </h3>
                <p className="text-xs text-slate-500">Cortes finalizados por você</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition"><X size={20} className="dark:text-white"/></button>
            </div>
            
            <div className="p-4 overflow-y-auto custom-scrollbar">
              {completedHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-400">Nenhum corte finalizado ainda.</div>
              ) : (
                <div className="space-y-3">
                  {completedHistory.map((app) => (
                    <div key={app.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white">{app.client?.full_name}</p>
                        <p className="text-xs text-slate-500">{format(new Date(app.date_time), "dd/MM 'às' HH:mm")}</p>
                      </div>
                      <span className="font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-lg">
                        R$ {app.total_price}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-center font-bold text-lg text-slate-900 dark:text-white">
                <span>Total Acumulado:</span>
                <span className="text-green-600 dark:text-green-400">R$ {stats.revenue}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CALENDÁRIO (SEUS CORTES) */}
      {showCalendarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border dark:border-slate-700 flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarIcon className="text-blue-600" size={20} /> Agenda Pessoal
                </h3>
                <p className="text-xs text-slate-500">Selecione um dia para ver os cortes.</p>
              </div>
              <button onClick={() => setShowCalendarModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition"><X size={20} className="dark:text-white"/></button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
              {/* Navegação do Mês */}
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><ChevronLeft className="dark:text-white" /></button>
                <span className="font-bold text-slate-800 dark:text-white capitalize">{format(calendarMonth, 'MMMM yyyy', { locale: ptBR })}</span>
                <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><ChevronRight className="dark:text-white" /></button>
              </div>

              {/* Grid do Calendário */}
              <div className="grid grid-cols-7 gap-2 mb-6">
                {['D','S','T','Q','Q','S','S'].map(d => <div key={d} className="text-center text-xs font-bold text-slate-400 py-1">{d}</div>)}
                {Array.from({ length: getDay(startOfMonth(calendarMonth)) }).map((_, i) => <div key={`empty-${i}`} />)}
                
                {daysInMonth.map((date) => {
                  const config = getDayConfig(date);
                  const isActive = config.active;
                  const isSelected = selectedCalendarDate && isSameDay(date, selectedCalendarDate);
                  const hasAppointments = myApps.some(app => isSameDay(new Date(app.date_time), date));

                  return (
                    <button
                      key={date.toString()}
                      disabled={!isActive}
                      onClick={() => setSelectedCalendarDate(date)}
                      className={`
                        aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all relative
                        ${isSelected ? 'bg-blue-600 text-white shadow-md' : ''}
                        ${!isSelected && isActive ? 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-blue-100 dark:hover:bg-slate-600' : ''}
                        ${!isActive ? 'bg-transparent text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50' : ''}
                      `}
                    >
                      {format(date, 'd')}
                      {hasAppointments && !isSelected && isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1"></div>}
                    </button>
                  );
                })}
              </div>

              {/* Lista de Agendamentos do Dia Selecionado */}
              {selectedCalendarDate && (
                <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-3 text-sm">
                    Agendamentos de {format(selectedCalendarDate, "dd 'de' MMMM", { locale: ptBR })}
                  </h4>
                  {selectedDayAppointments.length === 0 ? (
                    <p className="text-slate-400 text-xs text-center py-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl">Nenhum cliente neste dia.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedDayAppointments.map(app => (
                        <div key={app.id} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                          <div>
                            <p className="font-bold text-slate-800 dark:text-white text-sm">{app.client?.full_name}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Clock size={10} /> {format(new Date(app.date_time), 'HH:mm')}
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase
                            ${app.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                              app.status === 'confirmed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              app.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}
                          `}>
                            {app.status === 'completed' ? 'Feito' : app.status === 'pending' ? 'Pendente' : app.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL NÃO COMPARECEU */}
      {showNoShowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center border dark:border-slate-700">
            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserX size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Cliente não veio?</h3>
            <p className="text-slate-500 mb-6 text-sm">Isso cancelará o agendamento de <strong>{appointmentToNoShow?.client?.full_name}</strong>.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowNoShowModal(false)} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 dark:text-white font-bold hover:bg-slate-200 transition">Voltar</button>
              <button onClick={confirmNoShow} className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold shadow-lg transition">Confirmar Falta</button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-slate-900 dark:bg-black text-white pb-24 pt-8 px-6 shadow-xl transition-colors">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Painel da Barbearia</h1>
            <p className="text-slate-400 text-sm mt-1">{isAdmin ? 'Modo Administrador & Profissional' : 'Visão geral de toda a equipe.'}</p>
          </div>
          
          <div className="flex items-center gap-4">
            
            {/* BOTÃO DE NOTIFICAÇÕES PUSH */}
            <button 
              onClick={isPushSubscribed ? unsubscribeUser : subscribeUser}
              disabled={loadingPass || VAPID_PUBLIC_KEY === 'VAPID_PUBLIC_KEY_PLACEHOLDER'}
              className={`p-2 rounded-lg transition-all border shadow-lg flex items-center justify-center gap-2
                ${isPushSubscribed 
                    ? 'bg-blue-600 hover:bg-blue-700 border-blue-500 text-white' 
                    : 'bg-white/10 hover:bg-white/20 border-white/5 text-white'
                }
              `}
              title={isPushSubscribed ? "Desativar Notificações Push" : "Ativar Notificações Push em Segundo Plano"}
            >
              {loadingPass ? <Loader2 size={18} className="animate-spin" /> : <Bell size={18} />}
              <span className="hidden sm:inline">
                {isPushSubscribed ? 'Notificações Ativas' : 'Ativar Alertas'}
              </span>
            </button>
            
            {isAdmin && (
              <>
                <Link to="/admin/register-barber" className="p-2 rounded-lg bg-green-600 hover:bg-green-700 text-white border border-green-500 shadow-lg transition-all" title="Cadastrar Novo Barbeiro">
                  <UserPlus size={18} />
                </Link>
                <Link to="/admin/settings" className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 shadow-lg transition-all" title="Configurações">
                  <Settings size={18} />
                </Link>
              </>
            )}
            <button 
              onClick={() => setShowPasswordModal(true)} 
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/5 transition-all"
              title="Alterar Senha"
            >
              <Lock size={18} />
            </button>
            <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors text-sm font-medium border border-white/5">
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 -mt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          
          {/* Card Hoje */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div><p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Hoje</p><h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.today}</h3></div>
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400"><CalendarCheck size={24} /></div>
          </div>
          
          {/* Card Faturamento com Botão */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div><p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Seu Faturamento</p><h3 className="text-3xl font-extrabold text-green-600 dark:text-green-400">R$ {stats.revenue}</h3></div>
            <button 
              onClick={() => setShowHistoryModal(true)} 
              className="w-12 h-12 bg-green-50 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 hover:scale-105 transition-all cursor-pointer shadow-sm"
              title="Ver Histórico Financeiro"
            >
              <Wallet size={24} />
            </button>
          </div>

          {/* Card Seus Cortes COM BOTÃO DE CALENDÁRIO */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div><p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Seus Cortes</p><h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.total}</h3></div>
            <button 
              onClick={() => setShowCalendarModal(true)}
              className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 hover:scale-105 transition-all cursor-pointer shadow-sm"
              title="Ver Calendário de Agendamentos"
            >
              <Clock size={24} />
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Agenda Geral</h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {activeAppointments.length === 0 && <div className="p-12 text-center text-slate-500">Nenhum agendamento pendente ou confirmado.</div>}
            
            {activeAppointments.map((app) => {
              const isMine = app.barber_id === session.user.id;
              const isTodayApp = isToday(new Date(app.date_time));
              return (
                <div key={app.id} className={`p-6 transition-all flex flex-col sm:flex-row justify-between sm:items-start gap-4 group border-l-4 ${isMine ? 'bg-blue-50/40 dark:bg-blue-900/10 border-l-blue-600' : 'bg-white dark:bg-slate-800 border-l-transparent opacity-80 hover:opacity-100'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 shadow-sm ${isMine ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}>{app.client?.full_name?.charAt(0) || 'C'}</div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-900 dark:text-white text-lg">{app.client?.full_name || 'Cliente'}</h4>
                        {!isMine && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border bg-slate-100 dark:bg-slate-700 text-slate-500 border-slate-200 dark:border-slate-600">{app.barber?.full_name}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-1 mb-2"><span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 font-medium"><Clock size={12} /> {format(new Date(app.date_time), 'HH:mm')}</span><span>{format(new Date(app.date_time), "dd 'de' MMMM", { locale: ptBR })}</span></div>
                      {app.services && app.services.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{app.services.map((s, i) => <span key={i} className="text-xs px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300">{s.label}</span>)}<span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold border border-green-200 dark:border-green-800 rounded">Total: R$ {app.total_price}</span></div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                    {isMine ? (
                      app.status === 'pending' ? (
                        <>
                          <button onClick={() => updateStatus(app.id, 'confirmed')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-sm"><Check size={16} /> Aceitar</button>
                          <button onClick={() => updateStatus(app.id, 'cancelled')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-600 hover:text-red-600 transition-colors"><X size={16} /></button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 ${app.status === 'confirmed' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30' : 'bg-slate-100 text-slate-500'}`}>{app.status === 'confirmed' ? 'Confirmado' : app.status}</span>
                          {app.status === 'confirmed' && (
                            <>
                              <button onClick={() => updateStatus(app.id, 'completed')} className="ml-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-2 rounded-lg text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors" title="Finalizar Corte"><CheckCircle size={20} /></button>
                              
                              {/* --- BOTÃO CANCELAR ADICIONADO AQUI --- */}
                              <button 
                                onClick={() => {
                                    if(window.confirm('Tem certeza que deseja cancelar este agendamento confirmado?')) {
                                        updateStatus(app.id, 'cancelled');
                                    }
                                }} 
                                className="ml-1 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors" 
                                title="Cancelar Agendamento"
                              >
                                <X size={20} />
                              </button>
                              {/* ------------------------------------- */}

                              <button onClick={() => handleOpenNoShow(app)} disabled={!isTodayApp} className={`ml-1 p-2 rounded-lg border transition-colors ${isTodayApp ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-500 hover:bg-red-100' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-300 cursor-not-allowed'}`} title="Cliente não compareceu"><UserX size={20} /></button>
                            </>
                          )}
                        </div>
                      )
                    ) : <div className="opacity-50 flex items-center gap-2 text-sm font-medium text-slate-500"><Scissors size={14} /> Agenda de {app.barber?.full_name?.split(' ')[0]}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  );
}