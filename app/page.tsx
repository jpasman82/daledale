import { supabase } from '../lib/supabase'

export const revalidate = 0

export default async function MonitorDashboard() {
  const { data, error } = await supabase
    .from('monitor_flujo_caja')
    .select('*')
    .order('fecha_cobro_proyectada', { ascending: true })

  if (error) {
    return <div className="p-8 text-red-600 font-bold">Error cargando datos de Supabase</div>
  }

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Monitor de Flujo de Caja - Daled</h1>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factura</th>
              <th className="py-3 px-6 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
              <th className="py-3 px-6 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Proyectada</th>
              <th className="py-3 px-6 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Desfasaje</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.map((fila: any) => (
              <tr key={fila.nro_factura} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-6 whitespace-nowrap text-sm font-medium text-gray-900">{fila.cliente}</td>
                <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-500">{fila.nro_factura}</td>
                <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-900 text-center">${fila.monto_neto}</td>
                <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-500 text-center">{fila.fecha_cobro_proyectada}</td>
                <td className="py-4 px-6 whitespace-nowrap text-sm font-bold text-red-600 text-center">{fila.dias_desfasaje} días</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}