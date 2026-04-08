"use client"

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export const dynamic = 'force-dynamic'

export default function CuentaCorriente() {
  const [tipo, setTipo] = useState<'clientes' | 'acreedores'>('clientes')
  const [entidades, setEntidades] = useState<any[]>([])
  const [seleccionadoId, setSeleccionadoId] = useState<string>('')
  
  const [movimientos, setMovimientos] = useState<any[]>([])
  const [totales, setTotales] = useState({ total: 0, pagado: 0, saldo: 0 })

  // Carga la lista del desplegable
  useEffect(() => {
    async function cargarEntidades() {
      const tabla = tipo === 'clientes' ? 'clientes' : 'acreedores'
      const { data } = await supabase.from(tabla).select('id, nombre').order('nombre')
      setEntidades(data || [])
      setSeleccionadoId('')
      setMovimientos([])
    }
    cargarEntidades()
  }, [tipo])

  // Carga los movimientos de la cuenta seleccionada
  useEffect(() => {
    async function cargarCuenta() {
      if (!seleccionadoId) return

      if (tipo === 'clientes') {
        const { data } = await supabase.from('ventas').select('*').eq('cliente_id', seleccionadoId).order('fecha_emision', { ascending: false })
        if (data) {
          setMovimientos(data)
          let t = 0, p = 0
          data.forEach(m => { t += Number(m.monto_neto); p += Number(m.monto_cobrado || 0) })
          setTotales({ total: t, pagado: p, saldo: t - p })
        }
      } else {
        const { data } = await supabase.from('deudas').select('*').eq('acreedor_id', seleccionadoId).order('fecha_vencimiento', { ascending: false })
        if (data) {
          setMovimientos(data)
          let t = 0, p = 0
          data.forEach(m => { 
            const cap = Number(m.monto_neto)
            const int = Number(m.interes || 0)
            t += (cap + int); p += Number(m.monto_pagado || 0) 
          })
          setTotales({ total: t, pagado: p, saldo: t - p })
        }
      }
    }
    cargarCuenta()
  }, [seleccionadoId, tipo])

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Gestor de Cuenta Corriente</h1>

        {/* Controles de Selección */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8 flex gap-6 items-end">
          <div className="w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Entidad</label>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button onClick={() => setTipo('clientes')} className={`flex-1 py-2 rounded-md font-bold text-sm transition-colors ${tipo === 'clientes' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Clientes (A Cobrar)</button>
              <button onClick={() => setTipo('acreedores')} className={`flex-1 py-2 rounded-md font-bold text-sm transition-colors ${tipo === 'acreedores' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}>Acreedores (A Pagar)</button>
            </div>
          </div>
          <div className="w-2/3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar {tipo === 'clientes' ? 'Cliente' : 'Acreedor'}</label>
            <select value={seleccionadoId} onChange={(e) => setSeleccionadoId(e.target.value)} className="block w-full rounded-md border border-gray-300 p-2 bg-white text-lg">
              <option value="">-- Elegir de la lista --</option>
              {entidades.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
        </div>

        {/* Panel de Cuenta Corriente */}
        {seleccionadoId && (
          <div className="space-y-6">
            
            {/* Tarjetas de Resumen */}
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-gray-400">
                <p className="text-sm font-medium text-gray-500 mb-1">Total Histórico Operado</p>
                <p className="text-2xl font-bold text-gray-900">${totales.total.toLocaleString('es-AR')}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
                <p className="text-sm font-medium text-gray-500 mb-1">{tipo === 'clientes' ? 'Total Cobrado' : 'Total Pagado'}</p>
                <p className="text-2xl font-bold text-green-600">${totales.pagado.toLocaleString('es-AR')}</p>
              </div>
              <div className={`bg-white p-6 rounded-lg shadow-sm border-l-4 ${tipo === 'clientes' ? 'border-blue-500' : 'border-red-500'}`}>
                <p className="text-sm font-medium text-gray-500 mb-1">Saldo Actual Pendiente</p>
                <p className={`text-3xl font-black ${tipo === 'clientes' ? 'text-blue-600' : 'text-red-600'}`}>
                  ${totales.saldo.toLocaleString('es-AR')}
                </p>
              </div>
            </div>

            {/* Historial Detallado */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
              <div className="p-4 bg-slate-800 text-white font-bold">Historial de Comprobantes</div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="py-3 px-6 text-left text-xs font-bold text-gray-500 uppercase">Estado</th>
                    <th className="py-3 px-6 text-left text-xs font-bold text-gray-500 uppercase">Fecha</th>
                    <th className="py-3 px-6 text-left text-xs font-bold text-gray-500 uppercase">Comprobante</th>
                    <th className="py-3 px-6 text-right text-xs font-bold text-gray-500 uppercase">Monto Total</th>
                    <th className="py-3 px-6 text-right text-xs font-bold text-gray-500 uppercase">Cancelado</th>
                    <th className="py-3 px-6 text-right text-xs font-bold text-gray-900 uppercase">Debe</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {movimientos.length === 0 ? <tr><td colSpan={6} className="py-8 text-center text-gray-500">No hay operaciones registradas.</td></tr> : movimientos.map((mov: any) => {
                    
                    const total = tipo === 'clientes' ? Number(mov.monto_neto) : Number(mov.monto_neto) + Number(mov.interes || 0)
                    const pagado = tipo === 'clientes' ? Number(mov.monto_cobrado || 0) : Number(mov.monto_pagado || 0)
                    const saldo = total - pagado
                    
                    let badge = 'bg-gray-100 text-gray-800'
                    if (mov.estado === 'Cobrada' || mov.estado === 'Pagada') badge = 'bg-green-100 text-green-800'
                    else if (mov.estado === 'Parcial') badge = 'bg-yellow-100 text-yellow-800'
                    else badge = 'bg-red-100 text-red-800'

                    return (
                      <tr key={mov.id} className="hover:bg-slate-50">
                        <td className="py-3 px-6"><span className={`px-2 py-1 rounded text-xs font-bold ${badge}`}>{mov.estado || 'Pendiente'}</span></td>
                        <td className="py-3 px-6 text-sm text-gray-500">{tipo === 'clientes' ? mov.fecha_emision : mov.fecha_vencimiento}</td>
                        <td className="py-3 px-6 text-sm font-medium text-gray-900">{tipo === 'clientes' ? mov.nro_factura : mov.nro_comprobante}</td>
                        <td className="py-3 px-6 text-sm text-gray-500 text-right">{mov.moneda} {total.toLocaleString('es-AR')}</td>
                        <td className="py-3 px-6 text-sm text-green-600 text-right">{pagado > 0 ? pagado.toLocaleString('es-AR') : '-'}</td>
                        <td className="py-3 px-6 text-sm font-bold text-gray-900 text-right">{saldo > 0 ? saldo.toLocaleString('es-AR') : '0'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            
          </div>
        )}
      </div>
    </main>
  )
}