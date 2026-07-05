# Fase 5 — Integracion de la Prediccion de Riesgo (IA) en el Frontend

## Objetivo

Integrar en el frontend una tarjeta de **Prediccion de riesgo (IA)** que consuma el endpoint:

```http
GET /api/v1/predictions/paciente/:id
```

La tarjeta se mostrara dentro de la vista del historial clinico del medico e incluira:

- Niveles de riesgo por categoria.
- Factores explicativos.
- Disclaimer.
- Manejo de los 4 estados: cargando, exito, datos insuficientes, error.

---

## Decisiones de diseno

| Decision | Opcion | Razones |
|----------|--------|---------|
| Ubicacion | `features/historial/` | El medico ya revisa graficas de signos vitales ahi; la prediccion complementa el analisis. Ruta: `/medico/historial/:id` |
| Carga de la prediccion | Bajo demanda (boton "Analizar riesgo") | Evita computos innecesarios, explicita que la IA es una herramienta de apoyo. Mas atractivo para demo. |
| Patron del servicio | Observable puro (Pattern A) | Todos los servicios del proyecto (`RecordService`, `PatientService`, etc.) devuelven `Observable`. Solo `AuthService` usa signals para estado global. |
| Estado local del componente | Signals | Todos los componentes del proyecto usan `signal()`, `computed()`, `@if`/`@for`. |

---

## Paso 1 — Modelo de datos y servicio

### Modelo: `core/models/prediction.model.ts`

Interfaz TypeScript que refleja **exactamente** la respuesta del backend (`prediction.service.ts` de la Fase 4):

```typescript
export type RiskCategory = 'cardiovascular' | 'metabolico' | 'respiratorio';
export type RiskLevel = 'bajo' | 'medio' | 'alto';
export type PredictionStatus = 'ok' | 'datos_insuficientes' | 'error_inferencia';

export interface CategoriaPrediccion {
  categoria: RiskCategory;
  probabilidad: number;
  nivel: RiskLevel;
  factores: string[];
}

export interface PredictionResponse {
  pacienteId: string;
  generadoEn: string;
  horizonte: 'proxima_visita';              // literal fijo
  estado: PredictionStatus;
  categorias: CategoriaPrediccion[];
  disclaimer: string;
}
```

### Servicio: `core/services/prediction.service.ts`

Sigue el patron de `RecordService` (Observable puro, `inject(HttpClient)`):

```typescript
@Injectable({ providedIn: 'root' })
export class PredictionService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/predictions`;

  getPrediction(pacienteId: string): Observable<PredictionResponse> {
    return this.http
      .get<ApiResponse<{ prediccion: PredictionResponse }>>(
        `${this.api}/paciente/${pacienteId}`
      )
      .pipe(map((r) => r.data.prediccion));
  }
}
```

El interceptor JWT existente envia automaticamente el token Bearer.

---

## Paso 2 — Componente `RiskPredictionCard`

### Ubicacion

```
shared/risk-prediction-card/
├── risk-prediction-card.ts
├── risk-prediction-card.html
└── risk-prediction-card.scss
```

Es un componente **standalone** y **reutilizable**, colocado en `shared/` porque podria usarse en historial y potencialmente en consulta.

### Inputs

```typescript
pacienteId = input.required<string>();
```

### Estados internos (signals)

```typescript
loading = signal(false);
resultado = signal<PredictionResponse | null>(null);
error = signal<string | null>(null);
```

### Comportamiento

- NO se llama al endpoint al inicializarse.
- Se muestra un boton "Analizar riesgo" (estado inicial).
- Al hacer clic: `loading = true`, llama al servicio.
- Al exito: asigna `resultado`, renderiza la tarjeta.
- Si `estado === 'datos_insuficientes'`: muestra mensaje "Historial clinico insuficiente para generar una prediccion."
- Si error: muestra mensaje de error + boton "Reintentar".

---

## Paso 3 — Diseno visual de la tarjeta

### Layout sugerido

```
┌─────────────────────────────────────────┐
│  Riesgo Clinico (IA)                    │
│                                         │
│  [Analizar riesgo]  ← boton (si idle)   │
│                                         │
│  ── Resultado ──                        │
│                                         │
│  Cardiovascular:  45%  ████░░░░  Medio  │
│    • Presion sistolica elevada          │
│                                         │
│  Metabolico:       72%  ███████░  Alto  │
│    • Glucosa maxima elevada             │
│    • IMC elevado                        │
│                                         │
│  Respiratorio:     12%  ██░░░░░░  Bajo  │
│                                         │
│  ─────────────────────────────────────  │
│  Disclaimer: Esta prediccion es...      │
└─────────────────────────────────────────┘
```

### Barra de progreso

No existe componente de barra de progreso en `shared/`. Se crea una inline con CSS (`div` con ancho porcentual) o en su defecto un `progress` HTML nativo estilizado. No requiere Chart.js.

### Colores por nivel

| Nivel | Color | CSS |
|-------|-------|-----|
| Bajo | Verde | `#16a34a` |
| Medio | Amarillo | `#ca8a04` |
| Alto | Rojo | `#dc2626` |

### Factores explicativos

Lista con bullets debajo de cada categoria. Si la categoria no tiene factores, se omite la lista.

### Disclaimer

Texto pequeño al pie, en gris (`color: var(--muted)`). Siempre visible cuando hay resultado.

---

## Paso 4 — Integracion en `features/historial/`

### Archivos a modificar

1. `features/historial/historial.ts` — importar `RiskPredictionCard`, anadirlo a `imports`, pasarlo al template
2. `features/historial/historial.html` — insertar `<app-risk-prediction-card [pacienteId]="pacienteId" />`

### Donde insertarlo en el template

```diff
  @if (chartsConDatos().length > 0) { ... }

+ <app-risk-prediction-card [pacienteId]="pacienteId" />

  <h2>Consultas</h2>
  <div class="lista">...</div>
```

Entre las graficas de signos vitales y la lista de consultas. El componente maneja autonomamente su estado interno (loading, error, resultado).

### Ruta

El componente ya esta en `/medico/historial/:id` (ver `consulta.ts:101` navega ahi). No requiere cambios de ruteo.

---

## Paso 5 — Control de visibilidad por rol

El componente `RiskPredictionCard` no necesita logica de roles propia. Se controla desde **donde se usa**:

En `historial.ts` ya existe `auth = inject(AuthService)`. En el template:

```html
@if (auth.role() === 'medico' || auth.role() === 'admin') {
  <app-risk-prediction-card [pacienteId]="pacienteId" />
}
```

El backend tambien valida el rol, esto es solo UX.

---

## Paso 6 — Estados de la interfaz

### Estado inicial (idle)

```
┌──────────────────────────┐
│  Riesgo Clinico (IA)     │
│                          │
│  [🧠 Analizar riesgo]    │
└──────────────────────────┘
```

### ⏳ Cargando

```
┌──────────────────────────┐
│  Riesgo Clinico (IA)     │
│                          │
│  ⟳ Analizando...         │
└──────────────────────────┘
```

Mientras loading es true, el boton se muestra como "Analizando..." con spinner/disabled.

### ✅ Exito

Tarjeta completa con categorias, barras, colores, factores y disclaimer (ver Paso 3).

### ⚠️ Datos insuficientes

```
┌──────────────────────────────────┐
│  Riesgo Clinico (IA)             │
│                                  │
│  Historial clinico insuficiente  │
│  para generar una prediccion.    │
│  Se requieren al menos 2         │
│  consultas previas con signos    │
│  vitales registrados.            │
│                                  │
│  [⟳ Reintentar]                   │
└──────────────────────────────────┘
```

Sin barras vacias ni falsos positivos.

### ❌ Error

```
┌──────────────────────────┐
│  Riesgo Clinico (IA)     │
│                          │
│  No se pudo obtener la   │
│  prediccion. Intente     │
│  nuevamente.             │
│                          │
│  [⟳ Reintentar]           │
└──────────────────────────┘
```

---

## Paso 7 — Coherencia visual

- Usar las mismas variables CSS del proyecto (`--primary`, `--muted`, `--border`, etc.).
- La tarjeta debe tener `class="card"` como las demas del historial.
- Tipografia: heredada del `body` (sin cambios).
- Espaciado: `padding: 1rem`, `gap: 0.75rem` entre elementos.
- Responsive: el layout de categorias se apila en vertical (flex column), funciona en mobile.

---

## Paso 8 — Verificacion de campos contra el backend

Confirmar que los campos de `PredictionResponse` en TypeScript coinciden exactamente con los devueltos por:

```http
GET /api/v1/predictions/paciente/:id
```

Campos que deben coincidir:

```
pacienteId:         string
generadoEn:         string (ISO 8601)
horizonte:          "proxima_visita" (literal)
estado:             "ok" | "datos_insuficientes" | "error_inferencia"
categorias[].categoria:   "cardiovascular" | "metabolico" | "respiratorio"
categorias[].probabilidad: number (0-1, 4 decimales)
categorias[].nivel:       "bajo" | "medio" | "alto"
categorias[].factores:    string[]
disclaimer:         string
```

---

## Criterios de cierre

- [ ] `prediction.model.ts` define `PredictionResponse`, `CategoriaPrediccion`, `RiskCategory`, `RiskLevel`, `PredictionStatus`
- [ ] `prediction.service.ts` consume `GET /predictions/paciente/:id` y devuelve `Observable<PredictionResponse>`
- [ ] `RiskPredictionCard` es un componente standalone en `shared/`
- [ ] El componente recibe `pacienteId` como `input.required<string>()`
- [ ] El componente carga bajo demanda (boton "Analizar riesgo")
- [ ] 4 estados implementados: idle/loading/exito/datos_insuficientes/error
- [ ] Cada categoria muestra: nombre traducido, probabilidad como %, barra de progreso colorida, nivel, factores
- [ ] Disclaimer visible al pie del resultado
- [ ] Boton reintentar en estado error y datos_insuficientes
- [ ] Integrado en `historial.html` entre graficas y lista de consultas
- [ ] Visible solo para medico/admin (control via `auth.role()`)
- [ ] Coherencia visual con el resto del proyecto (clase `card`, variables CSS)
- [ ] Prueba manual: medico ve prediccion, paciente no la ve, datos insuficientes muestra mensaje, error permite reintentar
