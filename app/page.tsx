"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export const dynamic = 'force-dynamic'

export default function MonitorGlobal() {
  const [cargandoInicial, setCargandoInicial] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [tcGlobal, setTcGlobal] = useState<Record<string, number>>({})
  const [datosTabla, setDatosTabla] = useState<any[]>([])
  const [mesesColumnas, setMesesColumnas] = useState<string[]>([])
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })
  const [vistaDetalle, setVistaDetalle] = useState<{abierto: boolean, tipo: string, mes: string, items: any[]}>({
    abierto: false, tipo: '', mes: '', items: []
  })
  
  const [kpis, setKpis] = useState({
    aCobrar: 0,
    deudasAPagar: 0,
    gastosPendientes: 0,
    cajaHistorica: 0
  })

  // Función de carga de datos optimizada
  const cargarDatos = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargandoInicial(true);
    else setActualizando(true);

    const [resTC, resVentas, resDeudas, resGastos] = await Promise.all([
      supabase.from('proyecciones_tc').select('*'),
      supabase.from('ventas').select('*, cliente:clientes(*)'),
      supabase.from('deudas').select('*, acreedor:acreedores(*)'),
      supabase.from('gastos').select('*')
    ])

    const mapaTC: Record<string, number> = {}
    resTC.data?.forEach(row => mapaTC[row.mes_anio] = row.tc_proyectado)
    setTcGlobal(mapaTC)

    const hoy = new Date()
    const columnas: string[] = []
    const matriz: Record<string, any> = {}

    // Generamos 12 meses
    for (let i = 0; i < 12; i++) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1)
      const llave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      columnas.push(llave)
      matriz[llave] = { 
        llave, ingresosItems: [], deudasItems: [], gastosItems: [], 
        ingresos: 0, egresosDeuda: 0, egresosGasto: 0, neto: 0, acumulado: 0 
      }
    }

    const getTC = (llave: string) => mapaTC[llave] || 1000

    let totalACobrar = 0
    let totalDeudas = 0
    let totalGastos = 0
    let cajaHistorica = 0

    // Lógica de Ingresos
    resVentas.data?.forEach(v => {
      const pendiente = parseFloat(v.monto_neto || 0) - parseFloat(v.monto_cobrado || 0)
      cajaHistorica += parseFloat(v.monto_cobrado || 0)
      if (pendiente > 0) {
        totalACobrar += pendiente
        const fecha = new Date(v.fecha_emision)
        fecha.setDate(fecha.getDate() + (v.cliente?.dias_pago_real_avg || 30))
        const llave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
        if (matriz[llave]) {
          const montoConv = v.moneda === 'ARS' ? pendiente : pendiente * getTC(llave)
          matriz[llave].ingresos += montoConv
          matriz[llave].ingresosItems.push(v)
        }
      }
    })

    // Lógica de Deudas
    resDeudas.data?.forEach(d => {
      const pendiente = (parseFloat(d.monto_neto || 0) + parseFloat(d.interes || 0)) - parseFloat(d.monto_pagado || 0)
      cajaHistorica -= parseFloat(d.monto_pagado || 0)
      if (pendiente > 0 && d.estado !== 'Pagada') {
        totalDeudas += pendiente
        const fecha = new Date(d.fecha_vencimiento || d.fecha_inicio)
        const llave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
        if (matriz[llave]) {
          const montoConv = d.moneda === 'ARS' ? pendiente : pendiente * getTC(llave)
          matriz[llave].egresosDeuda += montoConv
          matriz[llave].deudasItems.push(d)
        }
      }
    })

    // Lógica de Gastos
    resGastos.data?.forEach(g => {
      const pendiente = parseFloat(g.monto_proyectado || 0) - parseFloat(g.monto_real_pagado || 0)
      cajaHistorica -= parseFloat(g.monto_real_pagado || 0)
      if (g.estado === 'Proyectado') {
        totalGastos += pendiente
        const fecha = new Date(g.fecha_proyectada)
        const llave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
        if (matriz[llave]) {
          const montoConv = g.moneda === 'ARS' ? pendiente : pendiente * getTC(llave)
          matriz[llave].egresosGasto += montoConv
          matriz[llave].gastosItems.push(g)
        }
      }
    })

    let arrastre = cajaHistorica
    const tablaFinal = columnas.map(llave => {
      const m = matriz[llave]
      m.neto = m.ingresos - m.egresosDeuda - m.egresosGasto
      arrastre += m.neto
      m.acumulado = arrastre
      return m
    })

    setKpis({ aCobrar: totalACobrar, deudasAPagar: totalDeudas, gastosPendientes: totalGastos, cajaHistorica })
    setMesesColumnas(columnas)
    setDatosTabla(tablaFinal)
    setCargandoInicial(false)
    setActualizando(false)
  }, []);

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const actualizarTC = async (mes: string, valor: string) => {
    const num = parseFloat(valor)
    if (isNaN(num)) return
    
    // Guardado silencioso en la base de datos
    const { error } = await supabase
      .from('proyecciones_tc')
      .upsert({ mes_anio: mes, tc_proyectado: num }, { onConflict: 'mes_anio' })

    if (error) {
      setMensaje({ tipo: 'error', texto: `Error al guardar TC: ${error.message}` })
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000)
    } else {
      // Recargamos datos de forma silenciosa para que la UI no salte
      cargarDatos(true)
    }
  }

  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(valor)
  }

  const nombreMes = (llave: string) => {
    const [anio, mes] = llave.split('-')
    const fecha = new Date(parseInt(anio), parseInt(mes) - 1, 1)
    return fecha.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' }).toUpperCase()
  }

  // Si es la primera carga, mostramos el splash completo
  if (cargandoInicial) return <div className="p-10 text-center font-bold text-gray-500">Iniciando Monitor Financiero...</div>

  // Lógica de Gráfico
  const maxAcumulado = Math.max(...datosTabla.map(d => d.acumulado), 1)
  const minAcumulado = Math.min(...datosTabla.map(d => d.acumulado), 0)
  const rangoAcumulado = maxAcumulado - minAcumulado || 1
  const anchoGrafico = 1000
  const altoGrafico = 250
  const paddingGrafico = 30
  const anchoPaso = anchoGrafico / (Math.max(datosTabla.length - 1, 1))

  const puntosLinea = datosTabla.map((d, i) => {
    const x = i * anchoPaso
    const y = altoGrafico - paddingGrafico - ((d.acumulado - minAcumulado) / rangoAcumulado) * (altoGrafico - paddingGrafico * 2)
    return `${x},${y}`
  }).join(' ')

  const ejeYZero = altoGrafico - paddingGrafico - ((0 - minAcumulado) / rangoAcumulado) * (altoGrafico - paddingGrafico * 2)

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-[1500px] mx-auto">
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black text-gray-800">Monitor Global Detallado</h1>
          <div className="flex items-center gap-4">
            {actualizando && <span className="text-xs font-bold text-blue-500 animate-pulse">Sincronizando...</span>}
            {mensaje.texto && (
              <div className={`px-4 py-1 rounded text-xs font-bold ${mensaje.tipo === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                {mensaje.texto}
              </div>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
            <p className="text-sm text-gray-500 font-bold uppercase mb-1">A Cobrar</p>
            <p className="text-2xl font-black text-blue-600">{formatearMoneda(kpis.aCobrar)}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
            <p className="text-sm text-gray-500 font-bold uppercase mb-1">Deudas Pendientes</p>
            <p className="text-2xl font-black text-red-600">{formatearMoneda(kpis.deudasAPagar)}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
            <p className="text-sm text-gray-500 font-bold uppercase mb-1">Gastos Proyectados</p>
            <p className="text-2xl font-black text-purple-600">{formatearMoneda(kpis.gastosPendientes)}</p>
          </div>
          <div className={`bg-white p-6 rounded-xl shadow-sm border-l-4 ${kpis.cajaHistorica >= 0 ? 'border-green-500' : 'border-red-500'}`}>
            <p className="text-sm text-gray-500 font-bold uppercase mb-1">Caja Real (Hoy)</p>
            <p className={`text-2xl font-black ${kpis.cajaHistorica >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatearMoneda(kpis.cajaHistorica)}</p>
          </div>
        </div>

        {/* TABLA HORIZONTAL */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-8 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="py-4 px-6 text-left font-bold sticky left-0 bg-slate-900 z-20 border-r border-slate-700">Conceptos</th>
                {mesesColumnas.map(llave => (
                  <th key={llave} className="py-4 px-6 text-center border-l border-slate-700 min-w-[150px]">
                    <div className="text-blue-400 font-black">{nombreMes(llave)}</div>
                    <div className="mt-2 flex flex-col items-center">
                      <span className="text-[9px] uppercase text-slate-400 font-bold">TC Proyectado</span>
                      <div className="flex items-center gap-1">
                        <span className="text-green-400 font-bold text-xs">$</span>
                        <input 
                          type="number" 
                          key={`tc-${llave}-${tcGlobal[llave]}`} // Forzamos remount solo del input si cambia el valor
                          defaultValue={tcGlobal[llave] || 1000}
                          onBlur={(e) => actualizarTC(llave, e.target.value)}
                          className="w-20 bg-slate-800 border-none text-xs text-center rounded text-green-400 font-bold focus:ring-1 focus:ring-green-400 p-1"
                        />
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr className="hover:bg-blue-50 transition-colors group">
                <td className="py-4 px-6 font-bold text-blue-800 sticky left-0 bg-white group-hover:bg-blue-50 z-10 border-r border-l-4 border-l-blue-500">Ingresos (Ventas)</td>
                {datosTabla.map(d => (
                  <td key={`v-${d.llave}`} onClick={() => setVistaDetalle({abierto:true, tipo:'INGRESOS', mes:d.llave, items:d.ingresosItems})} className="py-4 px-6 text-right cursor-pointer hover:font-black border-l">{formatearMoneda(d.ingresos)}</td>
                ))}
              </tr>
              <tr className="hover:bg-red-50 transition-colors group">
                <td className="py-4 px-6 font-bold text-red-800 sticky left-0 bg-white group-hover:bg-red-50 z-10 border-r border-l-4 border-l-red-500">Acreedores (Deudas)</td>
                {datosTabla.map(d => (
                  <td key={`d-${d.llave}`} onClick={() => setVistaDetalle({abierto:true, tipo:'DEUDAS', mes:d.llave, items:d.deudasItems})} className="py-4 px-6 text-right cursor-pointer hover:font-black border-l">{formatearMoneda(d.egresosDeuda)}</td>
                ))}
              </tr>
              <tr className="hover:bg-purple-50 transition-colors group">
                <td className="py-4 px-6 font-bold text-purple-800 sticky left-0 bg-white group-hover:bg-purple-50 z-10 border-r border-l-4 border-l-purple-500">Gastos Operativos</td>
                {datosTabla.map(d => (
                  <td key={`g-${d.llave}`} onClick={() => setVistaDetalle({abierto:true, tipo:'GASTOS', mes:d.llave, items:d.gastosItems})} className="py-4 px-6 text-right cursor-pointer hover:font-black border-l">{formatearMoneda(d.egresosGasto)}</td>
                ))}
              </tr>
              <tr className="bg-slate-100 font-bold">
                <td className="py-4 px-6 sticky left-0 bg-slate-200 z-10 border-r">Flujo Neto Mes</td>
                {datosTabla.map(d => (
                  <td key={`n-${d.llave}`} className={`py-4 px-6 text-right border-l ${d.neto >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatearMoneda(d.neto)}</td>
                ))}
              </tr>
              <tr className="bg-slate-800 text-white font-black">
                <td className="py-5 px-6 sticky left-0 bg-slate-900 z-10 border-r">Saldo Acumulado</td>
                {datosTabla.map(d => (
                  <td key={`a-${d.llave}`} className={`py-5 px-6 text-right border-l ${d.acumulado >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatearMoneda(d.acumulado)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* GRÁFICO SVG */}
        <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-8 text-center">Evolución de Caja Proyectada</h2>
          <div className="w-full overflow-x-auto">
            <svg viewBox={`-20 -20 ${anchoGrafico + 40} ${altoGrafico + 40}`} className="w-full min-w-[1000px] h-72 overflow-visible">
              <line x1="-20" y1={ejeYZero} x2={anchoGrafico + 20} y2={ejeYZero} stroke="#e2e8f0" strokeWidth="2" strokeDasharray="5,5" />
              <polyline points={puntosLinea} fill="none" stroke="#0f172a" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
              {datosTabla.map((d, i) => {
                const x = i * anchoPaso
                const y = altoGrafico - paddingGrafico - ((d.acumulado - minAcumulado) / rangoAcumulado) * (altoGrafico - paddingGrafico * 2)
                return (
                  <g key={`p-${i}`}>
                    <circle cx={x} cy={y} r="6" fill={d.acumulado >= 0 ? '#22c55e' : '#ef4444'} stroke="white" strokeWidth="2" />
                    <text x={x} y={y - 15} textAnchor="middle" fontSize="11" fontWeight="bold" fill={d.acumulado >= 0 ? '#16a34a' : '#dc2626'}>{formatearMoneda(d.acumulado)}</text>
                    <text x={x} y={altoGrafico + 15} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="bold">{nombreMes(d.llave)}</text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>

        {/* MODAL DETALLE */}
        {vistaDetalle.abierto && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
              <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Desglose: {vistaDetalle.tipo}</h3>
                  <p className="text-blue-400 text-sm font-bold uppercase">{nombreMes(vistaDetalle.mes)}</p>
                </div>
                <button onClick={() => setVistaDetalle({...vistaDetalle, abierto: false})} className="bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-colors text-xl w-10 h-10">✕</button>
              </div>
              <div className="p-6 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="border-b-2 border-slate-100">
                    <tr>
                      <th className="py-3 px-2 text-xs font-bold text-gray-400 uppercase">Referencia / Entidad</th>
                      <th className="py-3 px-2 text-xs font-bold text-gray-400 uppercase">Comprobante</th>
                      <th className="py-3 px-2 text-right text-xs font-bold text-gray-400 uppercase">Pendiente Orig.</th>
                      <th className="py-3 px-2 text-right text-xs font-bold text-gray-400 uppercase">Pesificado ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {vistaDetalle.items.map((it, idx) => {
                      const montoOrig = (it.monto_neto || it.monto_proyectado) + (it.interes || 0) - (it.monto_cobrado || it.monto_pagado || 0)
                      const montoPesificado = it.moneda === 'ARS' ? montoOrig : montoOrig * (tcGlobal[vistaDetalle.mes] || 1000)
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-4 px-2 font-bold text-slate-800">{it.cliente?.nombre || it.acreedor?.nombre || it.concepto}</td>
                          <td className="py-4 px-2 text-slate-500">{it.nro_factura || it.nro_comprobante || it.categoria}</td>
                          <td className="py-4 px-2 text-right text-slate-400 font-medium">{it.moneda} {montoOrig?.toLocaleString()}</td>
                          <td className="py-4 px-2 text-right font-black text-slate-900">{formatearMoneda(montoPesificado)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}