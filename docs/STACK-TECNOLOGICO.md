# Stack tecnológico

Este documento define y delimita las tecnologías del proyecto **Sistema de Inventario y Punto de Venta**. Cualquier decisión de frontend, backend o despliegue debe ajustarse a este stack.

---

## Frontend

| Tecnología   | Uso |
| ------------ | --- |
| **TypeScript** | Lenguaje principal; tipado estático en todo el código cliente. |
| **React.js**   | Biblioteca de UI y componentes. |
| **Next.js**    | Framework: rutas, SSR/SSG, API Routes y bundling. |
| **TailwindCSS**| Estilos utility-first y diseño responsive. |
| **Shadcn**     | Componentes de UI (botones, formularios, tablas, modales, etc.). |
| **React Icons**| Iconografía (lucide, heroicons, etc.) dentro de la app. |

**Criterio:** No introducir otros frameworks de UI (Vue, Svelte) ni otras librerías de componentes completas (Material UI, Chakra) como base; Shadcn + Tailwind son la referencia de diseño.

---

## Backend

| Tecnología   | Uso |
| ------------ | --- |
| **Next.js**  | API Routes como capa de backend (endpoints bajo `/app/api` o `/pages/api`). |
| **Supabase** | Base de datos (PostgreSQL), autenticación, almacenamiento y servicios en la nube. |
| **TypeScript** | Lenguaje en API Routes, tipos compartidos y lógica de negocio. |

**Criterio:** La persistencia y la autenticación se hacen con Supabase; no añadir otros BaaS o bases de datos sin alinear con este documento.

---

## Deployment

| Tecnología | Uso |
| ---------- | --- |
| **GitHub** | Repositorio del código, issues, pull requests y (opcional) GitHub Actions. |
| **Vercel** | Hosting y despliegue de la aplicación Next.js (preview y producción). |

**Criterio:** El despliegue principal es Vercel conectado al repo de GitHub; otros entornos (staging, etc.) deben documentarse como variantes de este flujo.

---

## Resumen

```text
Frontend:   TypeScript, React.js, Next.js, TailwindCSS, Shadcn, React Icons
Backend:    Next.js, Supabase, TypeScript
Deployment: GitHub, Vercel
```

Cuando se añadan dependencias o servicios nuevos, actualizar este archivo para mantener el stack delimitado y visible para todo el equipo.
