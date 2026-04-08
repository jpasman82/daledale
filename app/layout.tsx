import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="flex">
        <nav className="w-64 h-screen bg-slate-900 text-white p-6 space-y-4">
          <h2 className="text-xl font-bold mb-8 text-blue-400">DALED Admin</h2>
          <div className="flex flex-col space-y-2">
            <a href="/" className="hover:text-blue-300">📊 Monitor Global</a>
            <hr className="border-slate-700 my-4" />
            <p className="text-xs text-slate-500 uppercase">Ventas</p>
            <a href="/nuevo-cliente" className="hover:text-blue-300">👥 Clientes</a>
            <a href="/nueva-venta" className="hover:text-blue-300">💰 Nueva Venta</a>
            <hr className="border-slate-700 my-4" />
            <p className="text-xs text-slate-500 uppercase">Pasivos</p>
            <a href="/nuevo-acreedor" className="hover:text-blue-300">🏢 Acreedores</a>
            <a href="/nueva-deuda" className="hover:text-blue-300">📉 Cargar Deuda</a>
          </div>
        </nav>
        <div className="flex-1 bg-gray-50">{children}</div>
      </body>
    </html>
  )
}