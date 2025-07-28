"use client";

import Link from 'next/link';
import { Coins, Users, Settings, BarChart3, ArrowLeftRight } from 'lucide-react';

export default function AdminDashboard() {
  const adminFeatures = [
    {
      title: 'Gestión de Monedas',
      description: 'Administrar las monedas del sistema',
      icon: Coins,
      href: '/admin/currencies',
      color: 'bg-blue-500',
    },
    {
      title: 'Pares de Monedas',
      description: 'Gestionar pares de trading y monitoreo',
      icon: ArrowLeftRight,
      href: '/admin/currency-pairs',
      color: 'bg-indigo-500',
    },
    {
      title: 'Gestión de Usuarios',
      description: 'Administrar usuarios y permisos',
      icon: Users,
      href: '/admin/users',
      color: 'bg-green-500',
      disabled: true,
    },
    {
      title: 'Configuración',
      description: 'Configuración general del sistema',
      icon: Settings,
      href: '/admin/settings',
      color: 'bg-purple-500',
      disabled: true,
    },
    {
      title: 'Estadísticas',
      description: 'Ver estadísticas y reportes',
      icon: BarChart3,
      href: '/admin/analytics',
      color: 'bg-orange-500',
      disabled: true,
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard de Administración</h2>
        <p className="text-gray-600">Gestiona todos los aspectos del sistema desde aquí</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminFeatures.map((feature) => {
          const IconComponent = feature.icon;
          
          if (feature.disabled) {
            return (
              <div
                key={feature.title}
                className="bg-white rounded-lg shadow-sm border p-6 opacity-50 cursor-not-allowed"
              >
                <div className={`${feature.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                  <IconComponent className="text-white" size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm mb-3">{feature.description}</p>
                <span className="text-xs text-gray-400">Próximamente</span>
              </div>
            );
          }

          return (
            <Link
              key={feature.title}
              href={feature.href}
              className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
            >
              <div className={`${feature.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                <IconComponent className="text-white" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm">{feature.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}