"use client"

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export const dynamic = 'force-dynamic'

export default function ModuloClientes() {
  const [clientes, setClientes] = useState<any[]>([])
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [clienteEditando, setClienteEditando] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    nombre: '',
    cuit: '',
    dias_pago_contrato: 30,
    dias_pago_real_avg: 30
  })

  const cargarClientes = async () => {
    const { data, error } = await supabase.from('clientes').select('*').order('nombre', { ascending: true })
    if (!error && data) setClientes(data)
  }

  useEffect(() => {
    cargarClientes()
  }, [])

  const prepararEdicion = (cliente: any) => {
    setFormData({
      nombre: cliente.nombre,
      cuit: cliente.cuit || '',
      dias_pago_contrato: cliente.dias_pago_contrato,
      dias_pago_real_avg: cliente.dias_pago_real_avg
    })
    setClienteEditando(cliente.id)
    setMostrarFormulario(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelarFormulario = () => {
    setFormData({ nombre: '', cuit: '', dias_pago_contrato: 30, dias_pago_real_avg: 30 })
    setClienteEditando(null)
    setMostrarFormulario(false)
  }

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // NUEVA FUNCIÓN: Eliminar Cliente
  const handleEliminar = async () => {
    if (!clienteEditando) return
    
    // Pedimos confirmación antes de borrar
    if (!window.confirm("¿Estás seguro de que querés eliminar este cliente?")) return

    setCargando(true)
    setMensaje({ tipo: '', texto: '' })

    const { error } = await supabase.from('clientes').delete().eq('id', clienteEditando)

    if (error) {
      setMensaje({ tipo: 'error', texto: `No se pudo eliminar. (Si tiene facturas cargadas, borralas primero): ${error.message}` })
    } else {
      setMensaje({ tipo: 'exito', texto: '¡Cliente eliminado!' })
      cancelarFormulario()
      cargarClientes()
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000)
    }
    
    setCargando(false)
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setCargando(true)
    setMensaje({ tipo: '', texto: '' })

    const payload = {
      nombre: formData.nombre,
      cuit: formData.cuit,
      dias_pago_contrato: parseInt(formData.dias_pago_contrato.toString()),
      dias_pago_real_avg: parseInt(formData.dias_pago_real_avg.toString())
    }

    let error;

    if (clienteEditando) {
      const { error: updateError } = await supabase.from('clientes').update(payload).eq('id', clienteEditando)
      error = updateError
    } else {
      const { error: insertError } = await supabase.from('clientes').insert([payload])
      error = insertError
    }

    if (error) {
      setMensaje({ tipo: 'error', texto: `Error al guardar: ${error.message}` })
    } else {
      setMensaje({ tipo: 'exito', texto: clienteEditando ? '¡Cliente actualizado!' : '¡Cliente guardado!' })
      cancelarFormulario()
      cargarClientes()
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000)
    }
    
    setCargando(false)
  }

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Directorio de Clientes</h1>
          <button 
            onClick={mostrarFormulario ? cancelarFormulario : () => setMostrarFormulario(true)}
            className="bg-blue-600 text-white px-5 py-2 rounded shadow hover:bg-blue-700 font-bold transition-colors"
          >
            {mostrarFormulario ? '✖ Cancelar' : '✚ Nuevo Cliente'}
          </button>
        </div>

        {mensaje.texto && (
          <div className={`p-4 mb-6 rounded shadow-sm font-medium ${mensaje.tipo === 'error' ? 'bg-red-100 text-red-700 border-l-4 border-red-500' : 'bg-green-100 text-green-700 border-l-4 border-green-500'}`}>
            {mensaje.texto}
          </div>
        )}

        {mostrarFormulario && (
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8 transition-all">
            <h2 className="text-lg font-bold mb-4 text-gray-700 border-b pb-2">
              {clienteEditando ? '✏️ Editando Cliente' : '📄 Datos del Nuevo Cliente'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre / Razón Social *</label>
                  <input type="text" name="nombre" required value={formData.nombre} onChange={handleChange} className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CUIT</label>
                  <input type="text" name="cuit" value={formData.cuit} onChange={handleChange} className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Días de pago (Contrato)</label>
                  <input type="number" name="dias_pago_contrato" value={formData.dias_pago_contrato} onChange={handleChange} className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Días de pago (Real Estimado)</label>
                  <input type="number" name="dias_pago_real_avg" value={formData.dias_pago_real_avg} onChange={handleChange} className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              
              {/* Contenedor de botones (Eliminar a la izquierda, Guardar a la derecha) */}
              <div className="flex justify-between items-center pt-4 border-t mt-4">
                {clienteEditando ? (
                  <button 
                    type="button" 
                    onClick={handleEliminar} 
                    disabled={cargando}
                    className="text-red-600 hover:text-red-800 font-bold px-4 py-2"
                  >
                    🗑️ Eliminar Cliente
                  </button>
                ) : <div></div>}
                
                <button type="submit" disabled={cargando} className="bg-slate-800 text-white px-8 py-2 rounded font-bold hover:bg-slate-700 disabled:bg-slate-400 shadow-md">
                  {cargando ? 'Guardando...' : (clienteEditando ? 'Actualizar Cambios' : 'Guardar Cliente')}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-4 px-6 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="py-4 px-6 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">CUIT</th>
                <th className="py-4 px-6 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Plazo Teórico</th>
                <th className="py-4 px-6 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Plazo Real</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clientes.length === 0 ? (
                <tr><td colSpan={4} className="py-12 text-center text-gray-500">No hay clientes cargados.</td></tr>
              ) : (
                clientes.map((cliente: any) => (
                  <tr 
                    key={cliente.id} 
                    onClick={() => prepararEdicion(cliente)}
                    className="hover:bg-blue-50 transition-colors cursor-pointer"
                    title="Clic para editar"
                  >
                    <td className="py-4 px-6 whitespace-nowrap text-sm font-bold text-gray-900">{cliente.nombre}</td>
                    <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-500">{cliente.cuit || '-'}</td>
                    <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-500 text-center">{cliente.dias_pago_contrato} días</td>
                    <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-500 text-center font-medium">{cliente.dias_pago_real_avg} días</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}