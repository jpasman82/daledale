"use client"

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export const dynamic = 'force-dynamic'

export default function ModuloAcreedores() {
  const [acreedores, setAcreedores] = useState<any[]>([])
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [acreedorEditando, setAcreedorEditando] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    nombre: '',
    cuit: '',
    rubro: ''
  })

  const cargarAcreedores = async () => {
    const { data, error } = await supabase.from('acreedores').select('*').order('nombre', { ascending: true })
    if (!error && data) setAcreedores(data)
  }

  useEffect(() => {
    cargarAcreedores()
  }, [])

  const prepararEdicion = (acreedor: any) => {
    setFormData({
      nombre: acreedor.nombre,
      cuit: acreedor.cuit || '',
      rubro: acreedor.rubro || ''
    })
    setAcreedorEditando(acreedor.id)
    setMostrarFormulario(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelarFormulario = () => {
    setFormData({ nombre: '', cuit: '', rubro: '' })
    setAcreedorEditando(null)
    setMostrarFormulario(false)
  }

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleEliminar = async () => {
    if (!acreedorEditando) return
    
    if (!window.confirm("¿Estás seguro de que querés eliminar este acreedor?")) return

    setCargando(true)
    setMensaje({ tipo: '', texto: '' })

    const { error } = await supabase.from('acreedores').delete().eq('id', acreedorEditando)

    if (error) {
      setMensaje({ tipo: 'error', texto: `No se pudo eliminar: ${error.message}` })
    } else {
      setMensaje({ tipo: 'exito', texto: '¡Acreedor eliminado!' })
      cancelarFormulario()
      cargarAcreedores()
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
      rubro: formData.rubro
    }

    let error;

    if (acreedorEditando) {
      const { error: updateError } = await supabase.from('acreedores').update(payload).eq('id', acreedorEditando)
      error = updateError
    } else {
      const { error: insertError } = await supabase.from('acreedores').insert([payload])
      error = insertError
    }

    if (error) {
      setMensaje({ tipo: 'error', texto: `Error al guardar: ${error.message}` })
    } else {
      setMensaje({ tipo: 'exito', texto: acreedorEditando ? '¡Acreedor actualizado!' : '¡Acreedor guardado!' })
      cancelarFormulario()
      cargarAcreedores()
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000)
    }
    
    setCargando(false)
  }

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Directorio de Acreedores</h1>
          <button 
            onClick={mostrarFormulario ? cancelarFormulario : () => setMostrarFormulario(true)}
            className="bg-slate-800 text-white px-5 py-2 rounded shadow hover:bg-slate-900 font-bold transition-colors"
          >
            {mostrarFormulario ? '✖ Cancelar' : '✚ Nuevo Acreedor'}
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
              {acreedorEditando ? '✏️ Editando Acreedor' : '🏢 Datos del Nuevo Acreedor'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre / Empresa *</label>
                  <input type="text" name="nombre" required value={formData.nombre} onChange={handleChange} className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CUIT</label>
                  <input type="text" name="cuit" value={formData.cuit} onChange={handleChange} className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rubro</label>
                  <select name="rubro" value={formData.rubro} onChange={handleChange} className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                    <option value="">Seleccionar...</option>
                    <option value="Insumos Médicos">Insumos Médicos</option>
                    <option value="Logística">Logística</option>
                    <option value="Servicios">Servicios</option>
                    <option value="Impuestos">Impuestos</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t mt-4">
                {acreedorEditando ? (
                  <button type="button" onClick={handleEliminar} disabled={cargando} className="text-red-600 hover:text-red-800 font-bold px-4 py-2">
                    🗑️ Eliminar Acreedor
                  </button>
                ) : <div></div>}
                
                <button type="submit" disabled={cargando} className="bg-blue-600 text-white px-8 py-2 rounded font-bold hover:bg-blue-700 disabled:bg-blue-300 shadow-md">
                  {cargando ? 'Guardando...' : (acreedorEditando ? 'Actualizar Cambios' : 'Guardar Acreedor')}
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
                <th className="py-4 px-6 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Rubro</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {acreedores.length === 0 ? (
                <tr><td colSpan={3} className="py-12 text-center text-gray-500">No hay acreedores cargados.</td></tr>
              ) : (
                acreedores.map((acreedor: any) => (
                  <tr 
                    key={acreedor.id} 
                    onClick={() => prepararEdicion(acreedor)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    title="Clic para editar"
                  >
                    <td className="py-4 px-6 whitespace-nowrap text-sm font-bold text-gray-900">{acreedor.nombre}</td>
                    <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-500">{acreedor.cuit || '-'}</td>
                    <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-500">
                      <span className="bg-gray-100 px-2 py-1 rounded text-xs">{acreedor.rubro || 'N/A'}</span>
                    </td>
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