import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Save, ArrowLeft, Clock, Calendar } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [openingTime, setOpeningTime] = useState('09:00');
  const [closingTime, setClosingTime] = useState('19:00');
  const [workDays, setWorkDays] = useState([]);
  const navigate = useNavigate();

  const daysOfWeek = [
    { id: 0, label: 'Domingo' },
    { id: 1, label: 'Segunda' },
    { id: 2, label: 'Terça' },
    { id: 3, label: 'Quarta' },
    { id: 4, label: 'Quinta' },
    { id: 5, label: 'Sexta' },
    { id: 6, label: 'Sábado' },
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('barbershop_settings')
        .select('*')
        .maybeSingle(); // maybeSingle não dá erro se não tiver dados

      if (error) throw error;

      if (data) {
        setOpeningTime(data.opening_time.slice(0, 5));
        setClosingTime(data.closing_time.slice(0, 5));
        setWorkDays(data.work_days || []);
      } else {
        // Se não existir configuração, cria uma padrão na hora (Auto-fix)
        await createDefaultSettings();
      }
    } catch (error) {
      alert('Erro ao carregar configurações: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async () => {
    const defaultDays = [1, 2, 3, 4, 5, 6];
    const { error } = await supabase
      .from('barbershop_settings')
      .insert([{ opening_time: '09:00', closing_time: '19:00', work_days: defaultDays }]);
    
    if (!error) {
      setWorkDays(defaultDays);
    }
  };

  const toggleDay = (dayId) => {
    if (workDays.includes(dayId)) {
      setWorkDays(workDays.filter(d => d !== dayId));
    } else {
      setWorkDays([...workDays, dayId].sort());
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Tenta atualizar. Se não existir id=1 (improvável com a correção acima, mas seguro), não faz nada.
      // O ideal é buscar o ID primeiro, mas vamos assumir que existe apenas 1 linha.
      // Vamos usar uma estratégia de Upsert sem ID fixo para ser mais seguro.
      
      // 1. Busca qualquer ID existente
      const { data: existing } = await supabase.from('barbershop_settings').select('id').limit(1).single();
      
      let error;
      if (existing) {
        const result = await supabase
          .from('barbershop_settings')
          .update({
            opening_time: openingTime,
            closing_time: closingTime,
            work_days: workDays
          })
          .eq('id', existing.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('barbershop_settings')
          .insert([{
            opening_time: openingTime,
            closing_time: closingTime,
            work_days: workDays
          }]);
        error = result.error;
      }

      if (error) throw error;
      alert('Configurações salvas com sucesso!');
      navigate('/admin');
    } catch (error) {
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-500">
        <Clock className="animate-spin mr-2" /> Carregando configurações...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 font-sans p-6 flex justify-center items-start pt-12 transition-colors duration-300">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 dark:bg-black p-6 text-white flex items-center gap-4">
          <Link to="/admin" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Configurações</h1>
            <p className="text-slate-400 text-sm">Defina seus horários e dias.</p>
          </div>
        </div>

        <div className="p-8 space-y-8">
          
          {/* Horários */}
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-white">
              <Clock className="text-blue-600" size={20} /> Horário de Atendimento
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Abertura</label>
                <input 
                  type="time" 
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  className="w-full p-4 text-xl font-bold bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-blue-500 outline-none dark:text-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Fechamento</label>
                <input 
                  type="time" 
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  className="w-full p-4 text-xl font-bold bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-blue-500 outline-none dark:text-white transition-colors"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Dica: Se o horário de fechamento for menor que o de abertura (ex: 02:00), o sistema entenderá que vai até o dia seguinte.
            </p>
          </div>

          <hr className="border-slate-100 dark:border-slate-700" />

          {/* Dias da Semana */}
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-white">
              <Calendar className="text-blue-600" size={20} /> Dias de Funcionamento
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {daysOfWeek.map((day) => {
                const isActive = workDays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    onClick={() => toggleDay(day.id)}
                    className={`py-3 px-4 rounded-xl font-medium text-sm transition-all border-2
                      ${isActive 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-300 dark:hover:border-slate-500'
                      }`}
                  >
                    {day.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="pt-6">
            <button 
              onClick={handleSave}
              disabled={loading}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-600/20 transition-all flex items-center justify-center gap-2 transform active:scale-95"
            >
              <Save size={20} /> Salvar Configurações
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}