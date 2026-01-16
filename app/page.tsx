"use client"
import { useState, useEffect } from "react"

const LOGIN_USER = process.env.NEXT_PUBLIC_LOGIN_USER || 'admin';
const LOGIN_PASS = process.env.NEXT_PUBLIC_LOGIN_PASS || 'admin';
import AbandonedCartManager from "@/components/abandoned-cart/AbandonedCartManager"
import CallRecord from "@/components/CallRecord"
import ProductsManager from "@/components/products/ProductsManager"
import LeadsManager from "@/components/leads/LeadsManager"
import { Button } from "@/components/ui/button"
import { ShoppingCart, ShoppingBag, Settings as SettingsIcon, User, LogOut, BarChart3, Menu, X, ChevronLeft, PhoneCall } from "lucide-react"
import Settings from "@/components/Settings"
import { TemplateProvider } from "@/components/TemplateStore"

const NAV = [
  { key: "abandoned", label: "Abandoned Carts", icon: <ShoppingCart className="h-5 w-5" /> },
  { key: "callrecord", label: "Call Records", icon: <PhoneCall className="h-5 w-5" /> },
  { key: "leads", label: "Leads", icon: <BarChart3 className="h-5 w-5" /> },
  // { key: "products", label: "Products", icon: <ShoppingBag className="h-5 w-5" /> },
]


export default function HomePage() {
  const [tab, setTab] = useState('abandoned')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  // Login state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  // On mount, sync state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTab(localStorage.getItem('dashboardTab') || 'abandoned')
      setSidebarCollapsed(localStorage.getItem('sidebarCollapsed') === 'true')
      localStorage.removeItem('isAuthenticated');
      setIsAuthenticated(false);
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboardTab', tab)
    }
  }, [tab])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString())
    }
  }, [sidebarCollapsed])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('isAuthenticated', isAuthenticated.toString())
    }
  }, [isAuthenticated])

  // Close mobile sidebar when clicking outside
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
  const toggleCollapse = () => setSidebarCollapsed(!sidebarCollapsed)

  // Login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (username === LOGIN_USER && password === LOGIN_PASS) {
      setIsAuthenticated(true)
      setLoginError('')
    } else {
      setLoginError('Invalid username or password')
    }
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-blue-200">
        <div className="w-full max-w-sm flex flex-col items-center">
          <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-xl w-full flex flex-col items-center">
            <img src="https://cdn.shopify.com/s/files/1/0576/7459/6542/files/vinod-logo1.png?v=1695027396" alt="Vinod Logo" className="h-20 mb-6 drop-shadow-lg mx-auto" />
            <div className="mb-5 w-full">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base bg-gray-50"
                autoFocus
                placeholder="Enter your username"
              />
            </div>
            <div className="mb-5 w-full">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base bg-gray-50"
                placeholder="Enter your password"
              />
            </div>
            {loginError && <div className="text-red-500 text-sm mb-4 text-center font-medium w-full">{loginError}</div>}
            <button
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-base shadow-sm transition-colors"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ...existing code...
  return (
    <TemplateProvider>
      <div className="flex min-h-screen bg-gray-50">
        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        {/* Sidebar */}
        <aside className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} 
          ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-72'} 
          fixed lg:sticky top-0 left-0 z-50 
          w-72 h-screen bg-white shadow-lg border-r border-gray-200 
          flex flex-col transform transition-transform duration-200 lg:transition-all lg:duration-200
        `}>
          {/* Header */}
          <div className={`p-6 border-b border-gray-100 relative ${sidebarCollapsed ? 'lg:p-4' : ''}`}>
            <div className="flex items-center justify-between">
              <div className={`flex items-center space-x-3 ${sidebarCollapsed ? 'lg:justify-center' : ''}`}> 
                <div className="flex items-center">
                  {sidebarCollapsed ? (
                    <img src="https://www.vinodsteel.com/cdn/shop/files/favicon_d7fabb53-318d-4269-875d-2cb0e9ccea6a_32x32.png?v=1694874663" alt="Vinod Icon" className="h-10 w-10" />
                  ) : (
                    <img src="https://cdn.shopify.com/s/files/1/0576/7459/6542/files/vinod-logo1.png?v=1695027396" alt="Vinod Logo" className="h-24 w-auto" />
                  )}
                </div>
              </div>
              {/* Mobile Close Button */}
              <button
                onClick={toggleSidebar}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            {/* Desktop Collapse Button */}
            <button
              onClick={toggleCollapse}
              className={`hidden lg:flex absolute -right-3 top-1/2 transform -translate-y-1/2 
                w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center 
                shadow-sm hover:shadow-md transition-shadow
                ${sidebarCollapsed ? 'rotate-180' : ''}`}
            >
              <ChevronLeft className="h-3 w-3 text-gray-600" />
            </button>
          </div>
          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            <div className="mb-6">
              <h3 className={`px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 ${
                sidebarCollapsed ? 'lg:hidden' : 'block'
              }`}>
                Main
              </h3>
              {NAV.map((item) => (
                <button
                  key={item.key}
                  className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-colors group ${
                    tab === item.key
                      ? "bg-blue-50 text-blue-700 border border-blue-100"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  onClick={() => {
                    setTab(item.key)
                    setSidebarOpen(false)
                  }}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <span className={`flex-shrink-0 ${
                    tab === item.key ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                  } ${sidebarCollapsed ? 'lg:mx-auto' : 'mr-3'}`}>
                    {item.icon}
                  </span>
                  <span className={`font-medium ${
                    tab === item.key ? "font-semibold" : ""
                  } ${sidebarCollapsed ? 'lg:hidden' : 'block'}`}>
                    {item.label}
                  </span>
                  {tab === item.key && !sidebarCollapsed && (
                    <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
                  )}
                  {tab === item.key && sidebarCollapsed && (
                    <div className="hidden lg:block absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-l-full"></div>
                  )}
                </button>
              ))}
            </div>
            <div className="mb-6">
              <h3 className={`px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 ${
                sidebarCollapsed ? 'lg:hidden' : 'block'
              }`}>
                Tools
              </h3>
              <button
                className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-colors group ${
                  tab === "settings"
                    ? "bg-blue-50 text-blue-700 border border-blue-100"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
                onClick={() => {
                  setTab("settings")
                  setSidebarOpen(false)
                }}
                title={sidebarCollapsed ? "Settings" : undefined}
              >
                <span className={`flex-shrink-0 ${
                  tab === "settings" ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                } ${sidebarCollapsed ? 'lg:mx-auto' : 'mr-3'}`}>
                  <SettingsIcon className="h-5 w-5" />
                </span>
                <span className={`font-medium ${
                  tab === "settings" ? "font-semibold" : ""
                } ${sidebarCollapsed ? 'lg:hidden' : 'block'}`}>
                  Settings
                </span>
                {tab === "settings" && !sidebarCollapsed && (
                  <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
                )}
                {tab === "settings" && sidebarCollapsed && (
                  <div className="hidden lg:block absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-l-full"></div>
                )}
              </button>
            </div>
          </nav>
          {/* User Profile */}
          <div className="p-4 border-t border-gray-100">
            <div className={`flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group ${
              sidebarCollapsed ? 'lg:justify-center lg:space-x-0' : ''
            }`}>
              <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className={`flex-1 min-w-0 ${sidebarCollapsed ? 'lg:hidden' : 'block'}`}>
                <p className="text-sm font-medium text-gray-900 truncate">Admin</p>
                <p className="text-xs text-gray-500 truncate">admin@vinodsteel.com</p>
              </div>
              <LogOut className={`w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0 ${
                sidebarCollapsed ? 'lg:hidden' : 'block'
              }`} />
            </div>
          </div>
        </aside>
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {/* Mobile Header */}
          <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 p-4 sticky top-0 z-30">
            <div className="flex items-center justify-between">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Menu className="h-5 w-5 text-gray-600" />
              </button>
              <div className="flex items-center">
                <img src="https://cdn.shopify.com/s/files/1/0576/7459/6542/files/vinod-logo1.png?v=1695027396" alt="Vinod Logo" className="h-20 w-auto" />
              </div>
              <div className="w-8"></div>
            </div>
          </div>
          <div className="p-4 lg:p-8">
            <div className={tab === "abandoned" ? "block" : "hidden"}>
              <AbandonedCartManager />
            </div>
            <div className={tab === "callrecord" ? "block" : "hidden"}>
              <CallRecord />
            </div>
            <div className={tab === "leads" ? "block" : "hidden"}>
              <LeadsManager />
            </div>
            <div className={tab === "products" ? "block" : "hidden"}>
              <ProductsManager />
            </div>
            <div className={tab === "settings" ? "block" : "hidden"}>
              <Settings />
            </div>
          </div>
        </main>
      </div>
    </TemplateProvider>
  )
}