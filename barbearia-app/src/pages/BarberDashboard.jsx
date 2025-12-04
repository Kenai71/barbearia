import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { CalendarCheck, LogOut, Check, X, Clock, CheckCircle, TrendingUp, Scissors, Settings, Wallet, UserX, UserPlus, Lock, Loader2 } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export default function BarberDashboard({ session, isAdmin }) {
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({ total: 0, today: 0, pending: 0, revenue: 0 });
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [showNoShowModal, setShowNoShowModal] = useState(false);
  const [appointmentToNoShow, setAppointmentToNoShow] = useState(null);

  // Estados para Troca de Senha
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loadingPass, setLoadingPass] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    fetchAppointments();
    const subscription = supabase
      .channel('appointments_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchAppointments)
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, []);

  const fetchAppointments = async () => {
    // Busca TODOS os agendamentos (se for admin, o Supabase retorna tudo)
    const { data, error } = await supabase
      .from('appointments')
      .select(`*, client:client_id(full_name, email), barber:barber_id(full_name)`)
      .order('date_time', { ascending: true });

    if (!error && data) {
      setAppointments(data);

      // 1. Separa APENAS os agendamentos do usuário logado (seja ele Admin ou Barbeiro Comum)
      const myApps = data.filter(app => app.barber_id === session.user.id);

      const todayCount = myApps.filter(app => isToday(new Date(app.date_time))).length;
      const pendingCount = myApps.filter(app => app.status === 'pending').length;

      // 2. Calcula o faturamento usando APENAS a lista 'myApps' (pessoal) e não 'data' (geral)
      const totalRevenue = myApps
        .filter(app => app.status === 'completed')
        .reduce((acc, curr) => acc + (curr.total_price || 0), 0);

      setStats({ total: myApps.length, today: todayCount, pending: pendingCount, revenue: totalRevenue });
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

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-300 font-sans">
      
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div><p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Hoje</p><h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.today}</h3></div>
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400"><CalendarCheck size={24} /></div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div><p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Pendentes</p><h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.pending}</h3></div>
            <div className="w-12 h-12 bg-yellow-50 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center text-yellow-600 dark:text-yellow-400"><Clock size={24} /></div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            {/* Título alterado para indicar que é pessoal */}
            <div><p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Seu Faturamento</p><h3 className="text-3xl font-extrabold text-green-600 dark:text-green-400">R$ {stats.revenue}</h3></div>
            <div className="w-12 h-12 bg-green-50 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400"><Wallet size={24} /></div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div><p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Seus Cortes</p><h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{stats.total}</h3></div>
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300"><CheckCircle size={24} /></div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Agenda Geral</h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {appointments.length === 0 && <div className="p-12 text-center text-slate-500">Nenhum agendamento encontrado.</div>}
            {appointments.map((app) => {
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
                          <span className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 ${app.status === 'confirmed' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30' : app.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500'}`}>{app.status === 'confirmed' ? 'Confirmado' : app.status}</span>
                          {app.status === 'confirmed' && (
                            <>
                              <button onClick={() => updateStatus(app.id, 'completed')} className="ml-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-2 rounded-lg text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors" title="Finalizar Corte"><CheckCircle size={20} /></button>
                              <button onClick={() => handleOpenNoShow(app)} disabled={!isTodayApp} className={`ml-1 p-2 rounded-lg border transition-colors ${isTodayApp ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-500 hover:bg-red-100' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-300 cursor-not-allowed'}`}><UserX size={20} /></button>
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