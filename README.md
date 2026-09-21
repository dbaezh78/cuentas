# 💰 Mis Cuentas

Aplicación web para llevar el control de gastos mensuales personales.
Construida con React, TypeScript, Tailwind CSS y Firebase.

![Dashboard](https://img.shields.io/badge/React-18-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-10-orange?logo=firebase)
![Tailwind](https://img.shields.io/badge/Tailwind-3-cyan?logo=tailwindcss)

## ✨ Funcionalidades

- 📊 **Dashboard** con resumen del mes, gráfico de torta por categoría y barras históricas
- 💸 **Gestión de gastos**: agregar, editar, eliminar y filtrar
- 🏷️ **Categorías**: Combustible, Compras, Apartamento, Donaciones, Salud, Restaurantes, Transporte, Entretenimiento, Servicios, Otros
- 📅 **Reportes** mensuales con exportación a CSV
- 🔐 **Autenticación** con Google o email/contraseña
- 🔒 **Seguridad**: cada usuario solo ve sus propios datos (Firestore Rules)

## 🚀 Setup

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/cuentas.git
cd cuentas
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto
3. Activa **Authentication** → Sign-in method → habilita Google y Email/Password
4. Crea una base de datos **Firestore** en modo producción
5. Ve a Project Settings → General → Your apps → agrega una Web App
6. Copia las credenciales

### 4. Variables de entorno
```bash
cp .env.example .env
```
Edita `.env` y pega tus credenciales de Firebase:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 5. Desplegar reglas de Firestore
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

### 6. Correr en desarrollo
```bash
npm run dev
```

### 7. Build para producción
```bash
npm run build
# Opcional: deploy a Firebase Hosting
firebase deploy
```

## 📁 Estructura

```
src/
├── components/
│   ├── auth/          # Página de login
│   ├── dashboard/     # Gráficos y resumen
│   ├── expenses/      # Formulario y lista de gastos
│   └── layout/        # Sidebar y navegación
├── contexts/          # AuthContext
├── hooks/             # useExpenses
├── lib/               # Firebase config y utilidades
├── pages/             # DashboardPage, ExpensesPage, ReportsPage
└── types/             # Interfaces TypeScript
```

## 🔐 Seguridad

- Las credenciales de Firebase van en `.env` (ignorado por git)
- Firestore Rules garantizan que cada usuario solo puede leer/escribir sus datos
- Nunca subas tu archivo `.env` a GitHub

## 📄 Licencia

MIT
