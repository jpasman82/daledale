"use client"

import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function NuevoCliente() {
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  
  // Estado para guardar los datos del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    cuit: '',
    dias_pago_contrato: 30,
    dias_pago_real_avg: 30
  })

  // Manejador para actualizar el estado cuando el usuario escribe
  const handleChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  // Función que se ejecuta al enviar el formulario
  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setCargando(true)
    setMensaje({ tipo: '', texto: '' })

    const { error } = await supabase
      .from('clientes')
      .insert([
        {
          nombre: formData.nombre,
          cuit: formData.cuit,
          dias_pago_contrato: parseInt(formData.dias_pago_contrato.toString()),
          dias_pago_real_avg: parseInt(formData.dias_pago_real_avg.toString())
        }
      ])

    if (error) {
      setMensaje({ tipo: 'error', texto: `Error al guardar: ${error.message}` })
    } else {
      setMensaje({ tipo: 'exito', texto: '¡Cliente guardado correctamente!' })
      // Limpiamos el formulario
      setFormData({ nombre: '', cuit: '', dias_pago_contrato: 30, dias_pago_real_avg: 30 })
    }
    
    setCargando(false)
  }

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Alta de Nuevo Cliente</h1>
        
        {mensaje.texto && (
          <div className={`p-4 mb-6 rounded ${mensaje.tipo === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {mensaje.texto}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre / Razón Social *</label>
            <input 
              type="text" 
              name="nombre" 
              required 
              value={formData.nombre}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
              placeholder="Ej: Sanatorio Trinidad"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">CUIT</label>
            <input 
              type="text" 
              name="cuit" 
              value={formData.cuit}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
              placeholder="Ej: 30-12345678-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Días de pago (Contrato)</label>
              <input 
                type="number" 
                name="dias_pago_contrato" 
                value={formData.dias_pago_contrato}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
              />
              <p className="text-xs text-gray-500 mt-1">Lo que dice la factura</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Días de pago (Real Estimado)</label>
              <input 
                type="number" 
                name="dias_pago_real_avg" 
                value={formData.dias_pago_real_avg}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500" 
              />
              <p className="text-xs text-gray-500 mt-1">Cuánto tardan en pagar la realidad</p>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            <a href="/" className="text-blue-600 hover:underline text-sm">← Volver al Monitor</a>
            <button 
              type="submit" 
              disabled={cargando}
              className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 disabled:bg-blue-300"
            >
              {cargando ? 'Guardando...' : 'Guardar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}