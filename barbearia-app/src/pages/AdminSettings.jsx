import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Save, ArrowLeft, ChevronLeft, ChevronRight, X, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  addMonths, subMonths, getDay, isToday, parseISO 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [schedule, setSchedule] = useState({}); // Regra Geral (Dom-Sab)
  const [overrides, setOverrides] = useState({}); // Regra Específica (Datas)
  
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalConfig, setModalConfig] = useState({ active: true, start: '09:00', end: '19:00' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('barbershop_settings')
        .select('schedule, date_overrides')
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSchedule(data.schedule || {});
        setOverrides(data.date_overrides || {});
      }
    } catch (error) {
      alert('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getDayConfig = (date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    
    // 1. Se tiver override (data específica), usa ele (PRIORIDADE MÁXIMA)
    if (overrides[dateKey]) {
      return { ...overrides[dateKey], isOverride: true };
    }
    
    // 2. Se não, usa a regra da semana
    const dayOfWeek = getDay(date);
    return { ...schedule[dayOfWeek], isOverride: false };
  };

  const handleDayClick = (date) => {
    const config = getDayConfig(date);
    setSelectedDate(date);
    setModalConfig({
      active: config.active,
      start: config.start || '09:00',
      end: config.end || '19:00'
    });
  };

  const handleSaveDayConfig = async () => {
    if (!selectedDate) return;
    
    // Usa a data completa (ex: 2025-12-25) como chave. Isso garante que só afeta ESSE dia.
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const newOverrides = { ...overrides, [dateKey]: modalConfig };

    setOverrides(newOverrides);
    
    try {
      const { data: existing } = await supabase.from('barbershop_settings').select('id').maybeSingle();
      if (existing) {
        await supabase
          .from('barbershop_settings')
          .update({ date_overrides: newOverrides })
          .eq('id', existing.id);
      }
      setSelectedDate(null);
    } catch (error) {
      alert('Erro ao salvar: ' + error.message);
    }
  };

  const handleClearOverride = async () => {
    if (!selectedDate) return;
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    
    const newOverrides = { ...overrides };
    delete newOverrides[dateKey]; // Remove a exceção, volta ao normal da semana
    
    setOverrides(newOverrides);
    
    try {
      const { data: existing } = await supabase.from('barbershop_settings').select('id').maybeSingle();
      if (existing) {
        await supabase
          .from('barbershop_settings')
          .update({ date_overrides: newOverrides })
          .eq('id', existing.id);
      }
      setSelectedDate(null);
    } catch (error) {
      alert('Erro ao limpar: ' + error.message);
    }
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 font-sans p-4 md:p-6 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/admin" className="p-2 bg-white dark:bg-slate-800 rounded-full shadow hover:bg-slate-50 transition text-slate-700 dark:text-white">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gerenciar Calendário</h1>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-white transition"><ChevronLeft /></button>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white capitalize">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</h2>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-white transition"><ChevronRight /></button>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-2">{day}</div>)}
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: getDay(startOfMonth(currentMonth)) }).map((_, i) => <div key={`empty-${i}`} />)}

              {daysInMonth.map((date) => {
                const config = getDayConfig(date);
                const isOverride = config.isOverride;

                return (
                  <button
                    key={date.toString()}
                    onClick={() => handleDayClick(date)}
                    className={`
                      h-24 rounded-xl border-2 flex flex-col items-start justify-between p-2 transition-all relative overflow-hidden group
                      ${isToday(date) ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800' : ''}
                      ${!config.active 
                        ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/30' 
                        : isOverride 
                          ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
                          : 'bg-white border-slate-100 dark:bg-slate-800 dark:border-slate-700 hover:border-blue-300'}
                    `}
                  >
                    <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday(date) ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300'}`}>{format(date, 'd')}</span>
                    <div className="w-full">
                      {config.active ? (
                        <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 block text-center bg-slate-100 dark:bg-slate-700 rounded py-1">{config.start} - {config.end}</span>
                      ) : (
                        <span className="text-[10px] font-bold text-red-500 block text-center uppercase tracking-wide">Fechado</span>
                      )}
                    </div>
                    {isOverride && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500"></div>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Editar {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
              </h3>
              <button onClick={() => setSelectedDate(null)} className="text-slate-400 hover:text-red-500 transition"><X size={24} /></button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-4 rounded-xl">
                <span className="font-bold text-slate-700 dark:text-slate-300">Dia com Expediente?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={modalConfig.active} onChange={(e) => setModalConfig({...modalConfig, active: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>

              {modalConfig.active && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Abertura</label>
                    <input type="time" value={modalConfig.start} onChange={(e) => setModalConfig({...modalConfig, start: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Fechamento</label>
                    <input type="time" value={modalConfig.end} onChange={(e) => setModalConfig({...modalConfig, end: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-3">
              <button onClick={handleSaveDayConfig} className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${modalConfig.active ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                <Save size={20} /> {modalConfig.active ? 'Salvar Horário Específico' : 'Confirmar Folga Neste Dia'}
              </button>
              
              {overrides[format(selectedDate, 'yyyy-MM-dd')] && (
                <button onClick={handleClearOverride} className="w-full py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                  <Trash2 size={18} /> Restaurar Padrão da Semana
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}