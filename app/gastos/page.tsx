"use client"

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

const CAT_VARIABLES = ['MERCADERIA', 'LOGISTICA', 'CADETERIA', 'LICITACIONES']
const CAT_FIJOS = ['GASTOS ADMINISTRATIVO', 'GASTOS IMPOSITIVOS', 'GASTOS RRHH', 'GASTO FINANCIERO INTERESES']

export default function ModuloGastos() {
  const [vista, setVista] = useState<'lista' | 'crear' | 'pagar'>('lista')
  const [gastos, setGastos] = useState<any[]>([])
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  
  const [gastoSeleccionado, setGastoSeleccionado] = useState<any>(null)
  const [filtroEstado, setFiltroEstado] = useState<string>('Proyectado')
  
  const [formData, setFormData] = useState({
    concepto: '',
    categoria: CAT_VARIABLES[0],
    fecha_proyectada: new Date().toISOString().split('T')[0],
    moneda: 'ARS',
    monto_proyectado: ''
  })

  const [pagoData, setPagoData] = useState({
    monto_real_pagado: ''
  })

  const cargarGastos = async () => {
    const { data } = await supabase.from('gastos').select('*').order('fecha_proyectada', { ascending: true })
    if (data) setGastos(data)
  }

  useEffect(() => {
    cargarGastos()
  }, [])

  const abrirCreacion = () => {
    setFormData({
      concepto: '', categoria: CAT_VARIABLES[0], fecha_proyectada: new Date().toISOString().split('T')[0],
      moneda: 'ARS', monto_proyectado: ''
    })
    setVista('crear')
  }

  const abrirPago = (gasto: any) => {
    setGastoSeleccionado(gasto)
    setPagoData({ monto_real_pagado: gasto.monto_proyectado })
    setVista('pagar')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const volverAlListado = () => {
    setGastoSeleccionado(null)
    setVista('lista')
    cargarGastos()
  }

  const descargarModelo = () => {
    const meses = []
    const hoy = new Date()
    for (let i = 0; i < 12; i++) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1)
      const mesStr = String(fecha.getMonth() + 1).padStart(2, '0') + '-' + fecha.getFullYear()
      meses.push(mesStr)
    }

    const filas = [
      { Categoria: CAT_VARIABLES[0], Concepto: 'Ejemplo Variable', Moneda: 'ARS', ...Object.fromEntries(meses.map(m => [m, 15000])) },
      { Categoria: CAT_FIJOS[0], Concepto: 'Ejemplo Fijo', Moneda: 'ARS', ...Object.fromEntries(meses.map(m => [m, 100000])) }
    ]

    const hoja = XLSX.utils.json_to_sheet(filas)
    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, hoja, 'Proyecciones')
    XLSX.writeFile(libro, 'Plantilla_Gastos_Proyectados.xlsx')
  }

  const procesarImportacion = async (e: any) => {
    const archivo = e.target.files[0]
    if (!archivo) return

    setCargando(true)
    const reader = new FileReader()
    reader.onload = async (evento) => {
      try {
        const data = new Uint8Array(evento.target?.result as ArrayBuffer)
        const libro = XLSX.read(data, { type: 'array' })
        const hoja = libro.Sheets[libro.SheetNames[0]]
        const filas: any[] = XLSX.utils.sheet_to_json(hoja)

        const payloads = []
        const regexMes = /^\d{2}-\d{4}$/

        for (const fila of filas) {
          const categoria = fila.Categoria
          const concepto = fila.Concepto
          const moneda = fila.Moneda || 'ARS'

          if (!categoria || !concepto) continue

          for (const key of Object.keys(fila)) {
            if (regexMes.test(key) && fila[key]) {
              const monto = parseFloat(fila[key])
              if (monto > 0) {
                const [mes, anio] = key.split('-')
                const fecha_proyectada = `${anio}-${mes}-01`
                payloads.push({
                  categoria,
                  concepto,
                  fecha_proyectada,
                  moneda,
                  monto_proyectado: monto,
                  estado: 'Proyectado'
                })
              }
            }
          }
        }

        if (payloads.length > 0) {
          const { error } = await supabase.from('gastos').insert(payloads)
          if (error) throw error
          setMensaje({ tipo: 'exito', texto: `Se importaron ${payloads.length} gastos proyectados` })
          cargarGastos()
        } else {
          setMensaje({ tipo: 'error', texto: 'No se encontraron montos válidos en el archivo' })
        }
      } catch (error: any) {
        setMensaje({ tipo: 'error', texto: `Error al importar: ${error.message}` })
      }
      setCargando(false)
      e.target.value = ''
    }
    reader.readAsArrayBuffer(archivo)
  }

  const handleSubmitGasto = async (e: any) => {
    e.preventDefault()
    setCargando(true)
    
    const payload = {
      concepto: formData.concepto,
      categoria: formData.categoria,
      fecha_proyectada: formData.fecha_proyectada,
      moneda: formData.moneda,
      monto_proyectado: parseFloat(formData.monto_proyectado),
      estado: 'Proyectado'
    }

    const { error } = await supabase.from('gastos').insert([payload])

    if (error) setMensaje({ tipo: 'error', texto: error.message })
    else {
      setMensaje({ tipo: 'exito', texto: 'Gasto proyectado cargado correctamente' })
      volverAlListado()
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000)
    }
    setCargando(false)
  }

  const handleSubmitPago = async (e: any) => {
    e.preventDefault()
    setCargando(true)
    
    const pagado = parseFloat(pagoData.monto_real_pagado)
    
    const payload = {
      monto_real_pagado: pagado,
      estado: 'Pagado'
    }

    const { error } = await supabase.from('gastos').update(payload).eq('id', gastoSeleccionado.id)

    if (error) setMensaje({ tipo: 'error', texto: error.message })
    else {
      setMensaje({ tipo: 'exito', texto: 'Gasto marcado como pagado' })
      volverAlListado()
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000)
    }
    setCargando(false)
  }

  const handleEliminar = async (id: string) => {
    if (!window.confirm("¿Eliminar este gasto proyectado?")) return
    setCargando(true)
    const { error } = await supabase.from('gastos').delete().eq('id', id)
    if (error) setMensaje({ tipo: 'error', texto: error.message })
    else {
      setMensaje({ tipo: 'exito', texto: 'Gasto eliminado' })
      volverAlListado()
    }
    setCargando(false)
  }

  const gastosFiltrados = filtroEstado ? gastos.filter(g => g.estado === filtroEstado) : gastos

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {mensaje.texto && (
          <div className={`p-4 mb-6 rounded shadow-sm font-medium ${mensaje.tipo === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {mensaje.texto}
          </div>
        )}

        {vista === 'lista' && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800">Proyección de Gastos</h1>
              <div className="flex gap-4">
                <button onClick={descargarModelo} className="bg-slate-200 text-slate-800 px-4 py-2 rounded shadow hover:bg-slate-300 font-bold">
                  📄 Descargar Excel Modelo
                </button>
                <label className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 font-bold cursor-pointer">
                  {cargando ? 'Importando...' : '📥 Importar Excel'}
                  <input type="file" accept=".xlsx, .xls" onChange={procesarImportacion} className="hidden" disabled={cargando} />
                </label>
                <button onClick={abrirCreacion} className="bg-purple-600 text-white px-6 py-2 rounded shadow hover:bg-purple-700 font-bold">
                  ✚ Cargar Manual
                </button>
              </div>
            </div>

            <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4">
              <span className="font-bold text-gray-700">🔍 Ver:</span>
              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="border border-gray-300 rounded-md p-2 bg-gray-50 outline-none w-64">
                <option value="">Todos los Gastos</option>
                <option value="Proyectado">Proyectados (A Pagar)</option>
                <option value="Pagado">Pagados (Ejecutados)</option>
              </select>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="py-4 px-6 text-left text-xs font-bold text-gray-500 uppercase">Estado</th>
                    <th className="py-4 px-6 text-left text-xs font-bold text-gray-500 uppercase">Fecha Estimada</th>
                    <th className="py-4 px-6 text-left text-xs font-bold text-gray-500 uppercase">Categoría</th>
                    <th className="py-4 px-6 text-left text-xs font-bold text-gray-500 uppercase">Concepto</th>
                    <th className="py-4 px-6 text-right text-xs font-bold text-gray-500 uppercase">Proyectado</th>
                    <th className="py-4 px-6 text-right text-xs font-bold text-gray-900 uppercase">Real Pagado</th>
                    <th className="py-4 px-6 text-center text-xs font-bold text-gray-500 uppercase">Acción</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {gastosFiltrados.length === 0 ? <tr><td colSpan={7} className="py-12 text-center text-gray-500">No hay gastos en esta vista.</td></tr> : gastosFiltrados.map((gasto: any) => {
                      let badgeColor = gasto.estado === 'Pagada' || gasto.estado === 'Pagado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      
                      return (
                        <tr key={gasto.id} className={`hover:bg-slate-50 transition-colors ${gasto.estado === 'Pagado' ? 'opacity-60' : ''}`}>
                          <td className="py-4 px-6"><span className={`px-2 py-1 rounded text-xs font-bold ${badgeColor}`}>{gasto.estado}</span></td>
                          <td className="py-4 px-6 text-sm text-gray-500 font-medium">{gasto.fecha_proyectada}</td>
                          <td className="py-4 px-6"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold border border-gray-200">{gasto.categoria}</span></td>
                          <td className="py-4 px-6 font-bold text-gray-900">{gasto.concepto}</td>
                          <td className="py-4 px-6 text-right text-gray-500">{gasto.moneda} {gasto.monto_proyectado.toLocaleString('es-AR')}</td>
                          <td className="py-4 px-6 text-right font-bold text-purple-700">{gasto.estado === 'Pagado' ? `${gasto.moneda} ${gasto.monto_real_pagado.toLocaleString('es-AR')}` : '-'}</td>
                          <td className="py-4 px-6 text-center">
                            {gasto.estado === 'Proyectado' ? (
                              <button onClick={() => abrirPago(gasto)} className="bg-purple-100 text-purple-700 hover:bg-purple-200 font-bold px-3 py-1 rounded text-xs mr-2">Ejecutar</button>
                            ) : null}
                            <button onClick={() => handleEliminar(gasto.id)} className="text-red-400 hover:text-red-600 text-xs font-bold">Borrar</button>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {vista === 'crear' && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800">Cargar Gasto Proyectado</h1>
              <button onClick={volverAlListado} className="text-gray-600 hover:text-gray-900 font-bold">← Volver</button>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
              <form onSubmit={handleSubmitGasto} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Concepto *</label>
                    <input type="text" required value={formData.concepto} onChange={e => setFormData({...formData, concepto: e.target.value})} className="block w-full border rounded p-3" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                    <select value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} className="block w-full border rounded p-3 bg-white">
                      <optgroup label="Gastos Variables">
                        {CAT_VARIABLES.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                      <optgroup label="Gastos Fijos">
                        {CAT_FIJOS.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Proyectada *</label>
                    <input type="date" required value={formData.fecha_proyectada} onChange={e => setFormData({...formData, fecha_proyectada: e.target.value})} className="block w-full border rounded p-3" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                    <select value={formData.moneda} onChange={e => setFormData({...formData, moneda: e.target.value})} className="block w-full border rounded p-3 bg-white">
                      <option value="ARS">Pesos (ARS)</option>
                      <option value="USD">Dólares (USD)</option>
                      <option value="EUR">Euros (EUR)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto Proyectado *</label>
                    <input type="number" step="0.01" required value={formData.monto_proyectado} onChange={e => setFormData({...formData, monto_proyectado: e.target.value})} className="block w-full border rounded p-3 font-bold" />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <button type="submit" disabled={cargando} className="bg-purple-600 text-white px-10 py-3 rounded font-bold shadow hover:bg-purple-700">{cargando ? 'Guardando...' : 'Cargar Gasto'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {vista === 'pagar' && gastoSeleccionado && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800">Ejecutar Gasto</h1>
              <button onClick={volverAlListado} className="text-gray-600 hover:text-gray-900 font-bold">← Cancelar</button>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md border-2 border-purple-200 max-w-2xl mx-auto">
              <div className="mb-6 bg-purple-50 p-4 rounded text-center">
                <p className="text-sm text-purple-800 uppercase font-bold mb-1">{gastoSeleccionado.concepto}</p>
                <p className="text-xs text-gray-500 mb-2">Proyectado para el {gastoSeleccionado.fecha_proyectada}</p>
                <p className="text-2xl font-black text-gray-900">{gastoSeleccionado.moneda} {gastoSeleccionado.monto_proyectado.toLocaleString('es-AR')}</p>
              </div>

              <form onSubmit={handleSubmitPago} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto Real Pagado</label>
                  <input type="number" step="0.01" required value={pagoData.monto_real_pagado} onChange={e => setPagoData({...pagoData, monto_real_pagado: e.target.value})} className="block w-full border-2 border-purple-300 rounded p-3 text-xl font-bold text-center" />
                </div>

                <button type="submit" disabled={cargando} className="w-full bg-purple-600 text-white py-3 rounded font-bold shadow hover:bg-purple-700">
                  {cargando ? 'Procesando...' : 'Marcar como Pagado'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}