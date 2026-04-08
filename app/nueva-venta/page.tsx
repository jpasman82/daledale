"use client"

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// Esta línea es clave: obliga a la página a buscar datos frescos de Supabase cada vez que entrás
export const dynamic = 'force-dynamic'

export default function NuevaVenta() {
  const [clientes, setClientes] = useState<any[]>([])
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  
  const [formData, setFormData] = useState({
    cliente_id: '',
    nro_factura: '',
    fecha_emision: new Date().toISOString().split('T')[0],
    moneda: 'ARS',
    monto_neto: ''
  })

  // Función para cargar los clientes de la base de datos
  async function cargarClientes() {
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nombre')
      .order('nombre', { ascending: true })
    
    if (error) {
      console.error("Error cargando clientes:", error)
    } else {
      setClientes(data || [])
    }
  }

  // Se ejecuta apenas abrís la página
  useEffect(() => {
    cargarClientes()
  }, [])

  const handleChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setCargando(true)
    setMensaje({ tipo: '', texto: '' })

    // Insertamos la factura en la tabla 'ventas'
    const { error } = await supabase
      .from('ventas')
      .insert([
        {
          cliente_id: formData.cliente_id,
          nro_factura: formData.nro_factura,
          fecha_emision: formData.fecha_emision,
          moneda: formData.moneda,
          monto_neto: parseFloat(formData.monto_neto)
        }
      ])

    if (error) {
      setMensaje({ tipo: 'error', texto: `Error al guardar: ${error.message}` })
    } else {
      setMensaje({ tipo: 'exito', texto: '¡Factura cargada correctamente!' })
      // Limpiamos solo el número y el monto para poder seguir cargando facturas del mismo cliente
      setFormData({ ...formData, nro_factura: '', monto_neto: '' })
    }
    
    setCargando(false)
  }

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Cargar Nueva Venta / Factura</h1>
        
        {mensaje.texto && (
          <div className={`p-4 mb-6 rounded ${mensaje.tipo === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {mensaje.texto}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selector de Clientes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
            <div className="flex gap-2">
              <select 
                name="cliente_id" 
                required
                value={formData.cliente_id}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
              >
                <option value="">Seleccione un cliente...</option>
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
                ))}
              </select>
              {/* Botón rápido para recargar la lista si acabás de crear un cliente en otra pestaña */}
              <button 
                type="button" 
                onClick={cargarClientes}
                className="mt-1 p-2 bg-gray-200 rounded hover:bg-gray-300"
                title="Actualizar lista"
              >
                🔄
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nro Factura *</label>
              <input 
                type="text" 
                name="nro_factura" 
                required 
                value={formData.nro_factura}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha Emisión *</label>
              <input 
                type="date" 
                name="fecha_emision" 
                required 
                value={formData.fecha_emision}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Moneda</label>
              <select 
                name="moneda" 
                value={formData.moneda}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm bg-white"
              >
                <option value="ARS">Pesos (ARS)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Monto Neto *</label>
              <input 
                type="number" 
                step="0.01"
                name="monto_neto" 
                required 
                value={formData.monto_neto}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" 
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <a href="/" className="text-blue-600 hover:underline text-sm">← Volver al Monitor</a>
            <button 
              type="submit" 
              disabled={cargando}
              className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700 disabled:bg-blue-300 font-bold"
            >
              {cargando ? 'Guardando...' : 'Guardar Factura'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}