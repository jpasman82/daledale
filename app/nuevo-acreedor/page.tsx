"use client"
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function NuevoAcreedor() {
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  const [form, setForm] = useState({ nombre: '', cuit: '', rubro: '' })

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setCargando(true)
    setMensaje({ tipo: '', texto: '' })

    const { error } = await supabase.from('acreedores').insert([form])
    
    if (error) {
      setMensaje({ tipo: 'error', texto: `Error: ${error.message}` })
    } else {
      setMensaje({ tipo: 'exito', texto: 'Acreedor dado de alta correctamente' })
      setForm({ nombre: '', cuit: '', rubro: '' })
    }
    setCargando(false)
  }

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Nuevo Acreedor (Proveedores)</h1>
      
      {mensaje.texto && (
        <div className={`p-4 mb-6 rounded max-w-md ${mensaje.tipo === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-md space-y-4 bg-white p-6 rounded shadow-md border border-gray-100">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre / Empresa</label>
          <input 
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
            placeholder="Ej: Laboratorio Central" 
            value={form.nombre}
            onChange={e => setForm({...form, nombre: e.target.value})}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CUIT</label>
          <input 
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
            placeholder="30-XXXXXXXX-X" 
            value={form.cuit}
            onChange={e => setForm({...form, cuit: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rubro</label>
          <select 
            className="w-full p-2 border rounded bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={form.rubro}
            onChange={e => setForm({...form, rubro: e.target.value})}
          >
            <option value="">Seleccionar Rubro...</option>
            <option value="Insumos Médicos">Insumos Médicos</option>
            <option value="Logística">Logística</option>
            <option value="Servicios">Servicios</option>
            <option value="Impuestos">Impuestos / Tasas</option>
            <option value="Otros">Otros</option>
          </select>
        </div>

        <button 
          disabled={cargando}
          className="w-full bg-slate-800 text-white p-3 rounded font-bold hover:bg-slate-700 transition-colors disabled:bg-slate-400"
        >
          {cargando ? 'Guardando...' : 'Dar de Alta'}
        </button>
      </form>
    </div>
  )
}