import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Save, ArrowLeft, Clock, Calendar } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [openingTime, setOpeningTime] = useState('09:00');
  const [closingTime, setClosingTime] = useState('19:00');
  // 0 = Dom, 1 = Seg, ..., 6 = Sab
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
        .single();

      if (error) throw error;
      if (data) {
        setOpeningTime(data.opening_time.slice(0, 5)); // Remove segundos se houver
        setClosingTime(data.closing_time.slice(0, 5));
        setWorkDays(data.work_days || []);
      }
    } catch (error) {
      alert('Erro ao carregar configurações: ' + error.message);
    } finally {
      setLoading(false);
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
      const { error } = await supabase
        .from('barbershop_settings')
        .update({
          opening_time: openingTime,
          closing_time: closingTime,
          work_days: workDays
        })
        .eq('id', 1); // Atualiza sempre a linha 1

      if (error) throw error;
      alert('Configurações salvas com sucesso!');
      navigate('/admin');
    } catch (error) {
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 font-sans p-6 flex justify-center">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 dark:bg-black p-6 text-white flex items-center gap-4">
          <Link to="/admin" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Configurações da Barbearia</h1>
            <p className="text-slate-400 text-sm">Defina seus horários de funcionamento</p>
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
                <label className="block text-sm font-medium text-slate-500 mb-2">Abertura</label>
                <input 
                  type="time" 
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  className="w-full p-4 text-xl font-bold bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-blue-500 outline-none dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">Fechamento</label>
                <input 
                  type="time" 
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  className="w-full p-4 text-xl font-bold bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-blue-500 outline-none dark:text-white"
                />
              </div>
            </div>
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
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-300'
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
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Save size={20} /> Salvar Configurações
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}