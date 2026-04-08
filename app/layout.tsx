import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="flex">
        <nav className="w-64 min-h-screen bg-slate-900 text-white p-6 space-y-4">
          <div className="mb-8 flex flex-col items-center">
            <img 
              src="/logo-daled.png" 
              alt="DALED Logo" 
              className="w-32 h-auto mb-2"
            />
            <div className="h-1 w-full bg-blue-400 rounded-full opacity-50"></div>
          </div>

          <div className="flex flex-col space-y-2">
            <a href="/" className="hover:text-blue-300">📊 Monitor Global</a>
            
            <hr className="border-slate-700 my-4" />
            <p className="text-xs text-slate-500 uppercase">Ventas (Ingresos)</p>
            <a href="/nuevo-cliente" className="hover:text-blue-300">👥 Clientes</a>
            <a href="/nueva-venta" className="hover:text-blue-300">💰 Ventas / Cobros</a>
            <a href="/cuenta-corriente" className="hover:text-blue-300">🔄 Cuenta Corriente</a>
            
            <hr className="border-slate-700 my-4" />
            <p className="text-xs text-slate-500 uppercase">Pasivos (Egresos)</p>
            <a href="/nuevo-acreedor" className="hover:text-blue-300">🏢 Acreedores</a>
            <a href="/nueva-deuda" className="hover:text-blue-300">📉 Deudas</a>
            
            <hr className="border-slate-700 my-4" />
            <p className="text-xs text-slate-500 uppercase">Operativa</p>
            <a href="/gastos" className="hover:text-blue-300">💸 Gastos Proyectados</a>
          </div>
        </nav>
        <div className="flex-1 bg-gray-50 h-screen overflow-y-auto">{children}</div>
      </body>
    </html>
  )
}