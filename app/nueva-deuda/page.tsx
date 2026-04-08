"use client"

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export const dynamic = 'force-dynamic'

export default function ModuloDeudas() {
  const [vista, setVista] = useState<'lista' | 'crear' | 'detalle'>('lista')
  const [acreedores, setAcreedores] = useState<any[]>([])
  const [deudas, setDeudas] = useState<any[]>([])
  const [historial, setHistorial] = useState<any[]>([])
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  
  const [deudaSeleccionada, setDeudaSeleccionada] = useState<any>(null)
  const [filtroEstado, setFiltroEstado] = useState<string>('')
  
  const [formData, setFormData] = useState({
    acreedor_id: '',
    nro_comprobante: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    plazo_meses: '1',
    forma_pago: 'Mensual',
    moneda: 'ARS',
    monto_neto: '',
    tasa_interes_anual: ''
  })

  const [pagoData, setPagoData] = useState({
    fecha_pago: new Date().toISOString().split('T')[0],
    interes_calculado: '',
    capital_a_pagar: ''
  })

  const cargarAcreedores = async () => {
    const { data } = await supabase.from('acreedores').select('id, nombre').order('nombre', { ascending: true })
    if (data) setAcreedores(data)
  }

  const cargarDeudas = async () => {
    const { data } = await supabase.from('deudas').select('*, acreedor:acreedores(nombre)').order('fecha_inicio', { ascending: true })
    if (data) setDeudas(data)
  }

  const cargarHistorial = async (deudaId: string) => {
    const { data } = await supabase.from('pagos_deuda').select('*').eq('deuda_id', deudaId).order('fecha_pago', { ascending: true })
    if (data) setHistorial(data)
  }

  useEffect(() => {
    cargarAcreedores()
    cargarDeudas()
  }, [])

  const abrirCreacion = () => {
    setFormData({
      acreedor_id: '', nro_comprobante: '', fecha_inicio: new Date().toISOString().split('T')[0],
      plazo_meses: '1', forma_pago: 'Mensual', moneda: 'ARS', monto_neto: '', tasa_interes_anual: ''
    })
    setVista('crear')
  }

  const verDetalleDeuda = (deuda: any) => {
    setDeudaSeleccionada(deuda)
    setPagoData({ fecha_pago: new Date().toISOString().split('T')[0], interes_calculado: '', capital_a_pagar: '' })
    cargarHistorial(deuda.id)
    setVista('detalle')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const volverAlListado = () => {
    setDeudaSeleccionada(null)
    setVista('lista')
    cargarDeudas()
  }

  const calcularInteresDelPeriodo = () => {
    if (!deudaSeleccionada) return
    const inicio = new Date(deudaSeleccionada.fecha_ultimo_calculo || deudaSeleccionada.fecha_inicio || deudaSeleccionada.fecha_vencimiento)
    const fin = new Date(pagoData.fecha_pago)
    const dias = Math.max(0, Math.floor((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)))
    const saldoCapital = deudaSeleccionada.monto_neto - (deudaSeleccionada.monto_pagado || 0)
    const tasa = parseFloat(deudaSeleccionada.tasa_interes_anual || 0) / 100
    const interes = saldoCapital * (tasa / 365) * dias
    setPagoData({ ...pagoData, interes_calculado: interes.toFixed(2) })
  }

  const handleSubmitCondiciones = async (e: any) => {
    e.preventDefault()
    setCargando(true)
    const capital = parseFloat(formData.monto_neto)
    const tasa = formData.tasa_interes_anual ? parseFloat(formData.tasa_interes_anual) : 0
    const meses = parseInt(formData.plazo_meses)
    
    const fechaVencimientoObj = new Date(formData.fecha_inicio)
    fechaVencimientoObj.setMonth(fechaVencimientoObj.getMonth() + meses)
    const fechaVencimiento = fechaVencimientoObj.toISOString().split('T')[0]

    const payload = {
      acreedor_id: formData.acreedor_id, nro_comprobante: formData.nro_comprobante,
      fecha_inicio: formData.fecha_inicio, fecha_vencimiento: fechaVencimiento,
      plazo_meses: meses, forma_pago: formData.forma_pago, moneda: formData.moneda,
      monto_neto: capital, tasa_interes_anual: tasa,
      fecha_ultimo_calculo: formData.fecha_inicio, estado: 'Pendiente'
    }

    const { error } = await supabase.from('deudas').insert([payload])

    if (error) setMensaje({ tipo: 'error', texto: error.message })
    else {
      setMensaje({ tipo: 'exito', texto: 'Deuda originada correctamente' })
      volverAlListado()
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000)
    }
    setCargando(false)
  }

  const handleSubmitPago = async (e: any) => {
    e.preventDefault()
    setCargando(true)
    const capitalAbonado = pagoData.capital_a_pagar ? parseFloat(pagoData.capital_a_pagar) : 0
    const interesAbonado = pagoData.interes_calculado ? parseFloat(pagoData.interes_calculado) : 0
    const totalAbonado = capitalAbonado + interesAbonado

    const { error: pagoError } = await supabase.from('pagos_deuda').insert([{
      deuda_id: deudaSeleccionada.id, fecha_pago: pagoData.fecha_pago,
      capital_pagado: capitalAbonado, interes_pagado: interesAbonado, total_pagado: totalAbonado
    }])

    if (pagoError) {
      setMensaje({ tipo: 'error', texto: pagoError.message })
      setCargando(false)
      return
    }

    const nuevoCapitalPagado = parseFloat(deudaSeleccionada.monto_pagado || 0) + capitalAbonado
    const nuevoInteresHistorico = parseFloat(deudaSeleccionada.interes_pagado_total || 0) + interesAbonado
    
    let estadoCalculado = 'Pendiente'
    if (nuevoCapitalPagado > 0 && nuevoCapitalPagado < deudaSeleccionada.monto_neto) estadoCalculado = 'Parcial'
    if (nuevoCapitalPagado >= deudaSeleccionada.monto_neto) estadoCalculado = 'Pagada'

    const payloadDeuda = {
      monto_pagado: nuevoCapitalPagado, 
      interes_pagado_total: nuevoInteresHistorico,
      fecha_ultimo_calculo: pagoData.fecha_pago, 
      estado: estadoCalculado
    }

    const { data: updatedDeuda, error } = await supabase.from('deudas').update(payloadDeuda).eq('id', deudaSeleccionada.id).select('*, acreedor:acreedores(nombre)').single()
    
    if (error) setMensaje({ tipo: 'error', texto: error.message })
    else {
      setDeudaSeleccionada(updatedDeuda)
      cargarHistorial(deudaSeleccionada.id)
      setPagoData({ fecha_pago: new Date().toISOString().split('T')[0], interes_calculado: '', capital_a_pagar: '' })
      setMensaje({ tipo: 'exito', texto: 'Cancelación registrada con éxito' })
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000)
    }
    setCargando(false)
  }

  const handleEliminarDeuda = async () => {
    if (!deudaSeleccionada) return
    if (!window.confirm("¿Eliminar esta deuda y todo su historial de pagos?")) return
    setCargando(true)
    const { error } = await supabase.from('deudas').delete().eq('id', deudaSeleccionada.id)
    if (error) setMensaje({ tipo: 'error', texto: error.message })
    else {
      setMensaje({ tipo: 'exito', texto: 'Deuda eliminada' })
      volverAlListado()
    }
    setCargando(false)
  }

  const deudasFiltradas = filtroEstado ? deudas.filter(d => d.estado === filtroEstado) : deudas

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
              <h1 className="text-3xl font-bold text-gray-800">Cuentas a Pagar (Deudas)</h1>
              <button onClick={abrirCreacion} className="bg-red-600 text-white px-6 py-2 rounded shadow hover:bg-red-700 font-bold">
                ✚ Cargar Nueva Deuda
              </button>
            </div>

            <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4">
              <span className="font-bold text-gray-700">🔍 Filtrar por Estado:</span>
              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="border border-gray-300 rounded-md p-2 bg-gray-50 outline-none w-64">
                <option value="">Todas las Deudas</option>
                <option value="Pendiente">Pendientes</option>
                <option value="Parcial">Parciales (Con pagos)</option>
                <option value="Pagada">Pagadas (Canceladas)</option>
              </select>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="py-4 px-6 text-left text-xs font-bold text-gray-500 uppercase">Estado</th>
                    <th className="py-4 px-6 text-left text-xs font-bold text-gray-500 uppercase">Acreedor</th>
                    <th className="py-4 px-6 text-left text-xs font-bold text-gray-500 uppercase">Inicio</th>
                    <th className="py-4 px-6 text-right text-xs font-bold text-gray-500 uppercase">Capital Original</th>
                    <th className="py-4 px-6 text-right text-xs font-bold text-gray-900 uppercase">Capital Restante</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deudasFiltradas.length === 0 ? <tr><td colSpan={5} className="py-12 text-center text-gray-500">No hay deudas en este estado.</td></tr> : deudasFiltradas.map((deuda: any) => {
                      const saldoCapital = deuda.monto_neto - (deuda.monto_pagado || 0)
                      let badgeColor = 'bg-red-100 text-red-800'
                      if (deuda.estado === 'Pagada') badgeColor = 'bg-green-100 text-green-800'
                      if (deuda.estado === 'Parcial') badgeColor = 'bg-yellow-100 text-yellow-800'
                      
                      return (
                        <tr key={deuda.id} onClick={() => verDetalleDeuda(deuda)} className={`hover:bg-slate-50 transition-colors cursor-pointer ${deuda.estado === 'Pagada' ? 'opacity-50' : ''}`}>
                          <td className="py-4 px-6"><span className={`px-2 py-1 rounded text-xs font-bold ${badgeColor}`}>{deuda.estado || 'Pendiente'}</span></td>
                          <td className="py-4 px-6 font-bold text-gray-900">{deuda.acreedor?.nombre}</td>
                          <td className="py-4 px-6 text-sm text-gray-500">{deuda.fecha_inicio}</td>
                          <td className="py-4 px-6 text-right text-gray-500">{deuda.moneda} {deuda.monto_neto.toLocaleString('es-AR')}</td>
                          <td className="py-4 px-6 text-right font-bold text-red-600">{deuda.moneda} {saldoCapital.toLocaleString('es-AR')}</td>
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
              <h1 className="text-3xl font-bold text-gray-800">Alta de Nueva Deuda</h1>
              <button onClick={volverAlListado} className="text-gray-600 hover:text-gray-900 font-bold">← Volver al listado</button>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
              <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Condiciones de Origen</h2>
              <form onSubmit={handleSubmitCondiciones} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Acreedor *</label>
                    <select required value={formData.acreedor_id} onChange={e => setFormData({...formData, acreedor_id: e.target.value})} className="block w-full border rounded p-3 bg-white">
                      <option value="">Seleccione...</option>
                      {acreedores.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nro Comprobante</label>
                    <input type="text" value={formData.nro_comprobante} onChange={e => setFormData({...formData, nro_comprobante: e.target.value})} className="block w-full border rounded p-3" />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Origen *</label>
                    <input type="date" required value={formData.fecha_inicio} onChange={e => setFormData({...formData, fecha_inicio: e.target.value})} className="block w-full border rounded p-3" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plazo (Meses) *</label>
                    <input type="number" required min="1" value={formData.plazo_meses} onChange={e => setFormData({...formData, plazo_meses: e.target.value})} className="block w-full border rounded p-3" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pago</label>
                    <select value={formData.forma_pago} onChange={e => setFormData({...formData, forma_pago: e.target.value})} className="block w-full border rounded p-3 bg-white">
                      <option value="Mensual">Mensual</option>
                      <option value="Semestral">Semestral</option>
                      <option value="Anual">Anual</option>
                      <option value="Al Vencimiento">Al Vencimiento</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tasa Anual Pactada (%) *</label>
                    <input type="number" step="0.01" required value={formData.tasa_interes_anual} onChange={e => setFormData({...formData, tasa_interes_anual: e.target.value})} className="block w-full border rounded p-3" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 bg-gray-50 p-6 rounded border">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                    <select value={formData.moneda} onChange={e => setFormData({...formData, moneda: e.target.value})} className="block w-full border rounded p-3 bg-white">
                      <option value="ARS">Pesos (ARS)</option>
                      <option value="USD">Dólares (USD)</option>
                      <option value="EUR">Euros (EUR)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Capital Original (Monto de la Deuda) *</label>
                    <input type="number" step="0.01" required value={formData.monto_neto} onChange={e => setFormData({...formData, monto_neto: e.target.value})} className="block w-full border-2 border-red-300 rounded p-3 font-bold text-lg" />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button type="submit" disabled={cargando} className="bg-red-600 text-white px-10 py-3 rounded font-bold shadow hover:bg-red-700">{cargando ? 'Guardando...' : 'Generar Deuda'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {vista === 'detalle' && deudaSeleccionada && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-800">Expediente de Deuda</h1>
              <div className="flex gap-4">
                <button onClick={handleEliminarDeuda} className="text-red-500 hover:text-red-700 font-bold px-4">Eliminar Expediente</button>
                <button onClick={volverAlListado} className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700 font-bold">Volver al Listado</button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="col-span-4 bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500 uppercase font-bold">Acreedor</p>
                  <p className="text-2xl font-black text-gray-900">{deudaSeleccionada.acreedor?.nombre}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 uppercase font-bold">Estado</p>
                  <span className={`px-3 py-1 rounded text-sm font-bold ${deudaSeleccionada.estado === 'Pagada' ? 'bg-green-100 text-green-800' : (deudaSeleccionada.estado === 'Parcial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800')}`}>
                    {deudaSeleccionada.estado}
                  </span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Condiciones Pactadas</p>
                <p className="text-sm font-medium">Origen: {deudaSeleccionada.fecha_inicio}</p>
                <p className="text-sm font-medium">Plazo: {deudaSeleccionada.plazo_meses} Meses ({deudaSeleccionada.forma_pago})</p>
                <p className="text-sm font-medium">Tasa Anual: {deudaSeleccionada.tasa_interes_anual}%</p>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Capital Original</p>
                <p className="text-xl font-bold text-gray-900">{deudaSeleccionada.moneda} {deudaSeleccionada.monto_neto.toLocaleString('es-AR')}</p>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-red-200 bg-red-50">
                <p className="text-xs text-red-600 uppercase font-bold mb-1">Saldo Capital Restante</p>
                <p className="text-2xl font-black text-red-700">{deudaSeleccionada.moneda} {(deudaSeleccionada.monto_neto - (deudaSeleccionada.monto_pagado || 0)).toLocaleString('es-AR')}</p>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-yellow-200 bg-yellow-50">
                <p className="text-xs text-yellow-700 uppercase font-bold mb-1">Interés Histórico Pagado</p>
                <p className="text-xl font-bold text-yellow-800">{deudaSeleccionada.moneda} {parseFloat(deudaSeleccionada.interes_pagado_total || 0).toLocaleString('es-AR')}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-8">
              <div className="col-span-1">
                <div className="bg-white p-6 rounded-lg shadow-md border-2 border-blue-200 sticky top-6">
                  <h3 className="text-lg font-bold mb-4 text-blue-800 border-b pb-2">Registrar Cancelación</h3>
                  <form onSubmit={handleSubmitPago} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de la Cancelación</label>
                      <input type="date" required value={pagoData.fecha_pago} onChange={e => setPagoData({...pagoData, fecha_pago: e.target.value})} className="block w-full border rounded p-2" />
                    </div>
                    
                    <div className="pt-2 border-t">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cálculo de Intereses</label>
                      <div className="flex gap-2 mb-2">
                        <button type="button" onClick={calcularInteresDelPeriodo} className="w-full bg-slate-200 text-slate-700 py-2 rounded text-sm font-bold hover:bg-slate-300">
                          Calcular según plazo
                        </button>
                      </div>
                      <input type="number" step="0.01" value={pagoData.interes_calculado} onChange={e => setPagoData({...pagoData, interes_calculado: e.target.value})} placeholder="Interés a pagar" className="block w-full border rounded p-2 bg-yellow-50 font-bold" />
                      <p className="text-xs text-gray-500 mt-1">Podés modificar este valor manualmente si acordaste otro monto.</p>
                    </div>

                    <div className="pt-2 border-t">
                      <label className="block text-sm font-medium text-blue-700 mb-1 font-bold">Capital a Cancelar</label>
                      <input type="number" step="0.01" value={pagoData.capital_a_pagar} onChange={e => setPagoData({...pagoData, capital_a_pagar: e.target.value})} placeholder="Ej: 5000" className="block w-full border-2 border-blue-300 rounded p-2 text-lg font-bold" />
                    </div>

                    <div className="pt-4 mt-4 border-t">
                      <button type="submit" disabled={cargando} className="w-full bg-blue-600 text-white py-3 rounded font-bold shadow hover:bg-blue-700">
                        {cargando ? 'Procesando...' : 'Aplicar Cancelación'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="col-span-2">
                <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                  <div className="bg-slate-100 px-6 py-4 border-b">
                    <h3 className="font-bold text-gray-800">Flujo de la Deuda</h3>
                  </div>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-white">
                      <tr>
                        <th className="py-3 px-6 text-left text-xs font-bold text-gray-500 uppercase">Fecha</th>
                        <th className="py-3 px-6 text-left text-xs font-bold text-gray-500 uppercase">Movimiento</th>
                        <th className="py-3 px-6 text-right text-xs font-bold text-gray-500 uppercase">Capital Cancelado</th>
                        <th className="py-3 px-6 text-right text-xs font-bold text-gray-500 uppercase">Interés Pagado</th>
                        <th className="py-3 px-6 text-right text-xs font-bold text-gray-500 uppercase">Total Operación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr className="bg-gray-50">
                        <td className="py-4 px-6 text-sm text-gray-500">{deudaSeleccionada.fecha_inicio}</td>
                        <td className="py-4 px-6 text-sm font-bold text-gray-800">Origen de Deuda</td>
                        <td className="py-4 px-6 text-sm text-right text-gray-400">-</td>
                        <td className="py-4 px-6 text-sm text-right text-gray-400">-</td>
                        <td className="py-4 px-6 text-sm text-right font-bold text-gray-500">{deudaSeleccionada.moneda} {deudaSeleccionada.monto_neto.toLocaleString('es-AR')}</td>
                      </tr>
                      {historial.map((pago: any) => {
                        const total = parseFloat(pago.capital_pagado) + parseFloat(pago.interes_pagado)
                        return (
                          <tr key={pago.id} className="hover:bg-blue-50">
                            <td className="py-4 px-6 text-sm text-gray-500">{pago.fecha_pago}</td>
                            <td className="py-4 px-6 text-sm font-bold text-blue-700">Cancelación Parcial</td>
                            <td className="py-4 px-6 text-sm text-right font-medium text-blue-700">{parseFloat(pago.capital_pagado) > 0 ? `${deudaSeleccionada.moneda} ${parseFloat(pago.capital_pagado).toLocaleString('es-AR')}` : '-'}</td>
                            <td className="py-4 px-6 text-sm text-right font-medium text-yellow-600">{parseFloat(pago.interes_pagado) > 0 ? `${deudaSeleccionada.moneda} ${parseFloat(pago.interes_pagado).toLocaleString('es-AR')}` : '-'}</td>
                            <td className="py-4 px-6 text-sm text-right font-bold text-gray-900">{total > 0 ? `${deudaSeleccionada.moneda} ${total.toLocaleString('es-AR')}` : '-'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}