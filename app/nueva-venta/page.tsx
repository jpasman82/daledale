"use client"

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export const dynamic = 'force-dynamic'

export default function ModuloVentas() {
  const [clientes, setClientes] = useState<any[]>([])
  const [ventas, setVentas] = useState<any[]>([])
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [ventaEditando, setVentaEditando] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    cliente_id: '',
    nro_factura: '',
    fecha_emision: new Date().toISOString().split('T')[0],
    moneda: 'ARS',
    monto_neto: '',
    monto_cobrado: '' // NUEVO
  })

  const cargarClientes = async () => {
    const { data } = await supabase.from('clientes').select('id, nombre').order('nombre', { ascending: true })
    if (data) setClientes(data)
  }

  const cargarVentas = async () => {
    const { data, error } = await supabase
      .from('ventas')
      .select('*, cliente:clientes(nombre)')
      .order('fecha_emision', { ascending: false })
    if (!error && data) setVentas(data)
  }

  useEffect(() => {
    cargarClientes()
    cargarVentas()
  }, [])

  const prepararEdicion = (venta: any) => {
    setFormData({
      cliente_id: venta.cliente_id,
      nro_factura: venta.nro_factura,
      fecha_emision: venta.fecha_emision,
      moneda: venta.moneda || 'ARS',
      monto_neto: venta.monto_neto,
      monto_cobrado: venta.monto_cobrado || ''
    })
    setVentaEditando(venta.id)
    setMostrarFormulario(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelarFormulario = () => {
    setFormData({ cliente_id: '', nro_factura: '', fecha_emision: new Date().toISOString().split('T')[0], moneda: 'ARS', monto_neto: '', monto_cobrado: '' })
    setVentaEditando(null)
    setMostrarFormulario(false)
  }

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleEliminar = async () => {
    if (!ventaEditando) return
    if (!window.confirm("¿Estás seguro de que querés eliminar esta factura?")) return
    setCargando(true)
    setMensaje({ tipo: '', texto: '' })
    const { error } = await supabase.from('ventas').delete().eq('id', ventaEditando)
    if (error) setMensaje({ tipo: 'error', texto: `Error al eliminar: ${error.message}` })
    else {
      setMensaje({ tipo: 'exito', texto: '¡Factura eliminada!' })
      cancelarFormulario()
      cargarVentas()
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000)
    }
    setCargando(false)
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setCargando(true)
    setMensaje({ tipo: '', texto: '' })

    const capital = parseFloat(formData.monto_neto)
    const cobrado = formData.monto_cobrado ? parseFloat(formData.monto_cobrado) : 0

    let estadoCalculado = 'Pendiente'
    if (cobrado > 0 && cobrado < capital) estadoCalculado = 'Parcial'
    if (cobrado >= capital) estadoCalculado = 'Cobrada'

    const payload = {
      cliente_id: formData.cliente_id,
      nro_factura: formData.nro_factura,
      fecha_emision: formData.fecha_emision,
      moneda: formData.moneda,
      monto_neto: capital,
      monto_cobrado: cobrado,
      estado: estadoCalculado
    }

    let error;
    if (ventaEditando) {
      const { error: updateError } = await supabase.from('ventas').update(payload).eq('id', ventaEditando)
      error = updateError
    } else {
      const { error: insertError } = await supabase.from('ventas').insert([payload])
      error = insertError
    }

    if (error) setMensaje({ tipo: 'error', texto: `Error al guardar: ${error.message}` })
    else {
      setMensaje({ tipo: 'exito', texto: ventaEditando ? '¡Factura actualizada!' : '¡Factura cargada correctamente!' })
      cancelarFormulario()
      cargarVentas() 
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000)
    }
    setCargando(false)
  }

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Directorio de Ventas / Facturas</h1>
          <button onClick={mostrarFormulario ? cancelarFormulario : () => setMostrarFormulario(true)} className="bg-blue-600 text-white px-5 py-2 rounded shadow hover:bg-blue-700 font-bold">
            {mostrarFormulario ? '✖ Cancelar' : '✚ Nueva Venta'}
          </button>
        </div>

        {mensaje.texto && <div className={`p-4 mb-6 rounded shadow-sm font-medium ${mensaje.tipo === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{mensaje.texto}</div>}

        {mostrarFormulario && (
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
            <h2 className="text-lg font-bold mb-4 text-gray-700 border-b pb-2">{ventaEditando ? '✏️ Editando Factura / Cobro' : '📄 Datos de la Nueva Venta'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <div className="flex gap-2">
                  <select name="cliente_id" required value={formData.cliente_id} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-white"><option value="">Seleccione un cliente...</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nro Factura *</label><input type="text" name="nro_factura" required value={formData.nro_factura} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 p-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha Emisión *</label><input type="date" name="fecha_emision" required value={formData.fecha_emision} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 p-2" /></div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label><select name="moneda" value={formData.moneda} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-white"><option value="ARS">Pesos (ARS)</option><option value="USD">Dólares (USD)</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Total Facturado *</label><input type="number" step="0.01" name="monto_neto" required value={formData.monto_neto} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 p-2" /></div>
                <div><label className="block text-sm font-medium text-blue-700 mb-1 font-bold">Monto Cobrado</label><input type="number" step="0.01" name="monto_cobrado" value={formData.monto_cobrado} onChange={handleChange} placeholder="Ej: 5000" className="mt-1 block w-full rounded-md border-2 border-blue-200 p-2 bg-blue-50" /></div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t mt-4">
                {ventaEditando ? <button type="button" onClick={handleEliminar} className="text-red-600 hover:text-red-800 font-bold px-4 py-2">🗑️ Eliminar</button> : <div></div>}
                <button type="submit" disabled={cargando} className="bg-slate-800 text-white px-8 py-2 rounded font-bold hover:bg-slate-700 shadow-md">{cargando ? 'Guardando...' : 'Guardar Factura'}</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-4 px-6 text-left text-xs font-bold text-gray-500 uppercase">Estado</th>
                <th className="py-4 px-6 text-left text-xs font-bold text-gray-500 uppercase">Fecha</th>
                <th className="py-4 px-6 text-left text-xs font-bold text-gray-500 uppercase">Cliente</th>
                <th className="py-4 px-6 text-left text-xs font-bold text-gray-500 uppercase">Factura</th>
                <th className="py-4 px-6 text-right text-xs font-bold text-gray-500 uppercase">Total</th>
                <th className="py-4 px-6 text-right text-xs font-bold text-gray-500 uppercase">Cobrado</th>
                <th className="py-4 px-6 text-right text-xs font-bold text-gray-900 uppercase bg-green-50">Saldo a Cobrar</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ventas.length === 0 ? <tr><td colSpan={7} className="py-12 text-center text-gray-500">No hay ventas cargadas.</td></tr> : ventas.map((venta: any) => {
                  const capital = venta.monto_neto;
                  const cobrado = venta.monto_cobrado || 0;
                  const saldo = capital - cobrado;
                  
                  let badge = 'bg-red-100 text-red-800 border-red-200'
                  if (venta.estado === 'Cobrada') badge = 'bg-green-100 text-green-800 border-green-200'
                  if (venta.estado === 'Parcial') badge = 'bg-yellow-100 text-yellow-800 border-yellow-200'

                  return (
                    <tr key={venta.id} onClick={() => prepararEdicion(venta)} className={`hover:bg-blue-50 transition-colors cursor-pointer ${venta.estado === 'Cobrada' ? 'opacity-50 hover:opacity-100' : ''}`}>
                      <td className="py-4 px-6 whitespace-nowrap"><span className={`px-2 py-1 rounded text-xs font-bold border ${badge}`}>{venta.estado || 'Pendiente'}</span></td>
                      <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-500">{venta.fecha_emision}</td>
                      <td className="py-4 px-6 whitespace-nowrap text-sm font-bold text-gray-900">{venta.cliente?.nombre}</td>
                      <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-500">{venta.nro_factura}</td>
                      <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-500 text-right">{venta.moneda} {capital.toLocaleString('es-AR')}</td>
                      <td className="py-4 px-6 whitespace-nowrap text-sm font-medium text-green-600 text-right">{cobrado > 0 ? `${venta.moneda} ${cobrado.toLocaleString('es-AR')}` : '-'}</td>
                      <td className="py-4 px-6 whitespace-nowrap text-sm font-bold text-gray-900 text-right bg-green-50/30">{saldo > 0 ? `${venta.moneda} ${saldo.toLocaleString('es-AR')}` : '0'}</td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}