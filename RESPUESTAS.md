# Respuestas · Laboratorio 4

Alumno: 20212662
Presupuesto: [11] min Métrica DORA: [change failure rate]

## Parte 1 · Diagnóstico

### Defecto 1

- Job y etapa: smoke y deploy
- Problema que causa en el pipeline: No asegurar que la prueba smoke se realiza tras haberse desplegado la aplicación
- Link al commit:
- Corrección (una o más: mover de etapa / dejar como informativo / eliminar / ajustar configuración / modificar tests): mover de etapa o ajustar configuración
- Evidencia (dato observado, con link al run o fragmento de la salida local):

### Defecto 2

- Job y etapa: Smoke, post-deploy
- Problema que causa en el pipeline: El smoke se salta la comprobación de identidad de commit, es decir, podría probarse un commit cuando ya se actualizó e hizo otro commit que cambió la versión que se prueba. Esto es porque no recibe EXPECTED_COMMIT.
- Link al commit:
- Corrección (una o más: mover de etapa / dejar como informativo / eliminar / ajustar configuración / modificar tests): ajustar configuración
- Evidencia (dato observado, con link al run o fragmento de la salida local):

### Defecto 3

- Job y etapa: e2e, post-deploy.
- Problema que causa en el pipeline: El job instala Chromium y sus dependencias, y los tests solicitan una página de navegador para comprobar una API HTTP; sin embargo solo leen el JSON de la respuesta. Esto agrega tiempo de instalación y ejecución sin aprovechar naveador.
- Link al commit:
- Corrección (una o más: mover de etapa / dejar como informativo / eliminar / ajustar configuración / modificar tests): modificar tests, eliminar y ajustar configuración.
- Evidencia (dato observado, con link al run o fragmento de la salida local):

### Defecto 4

- Job y etapa: integration, pre-build
- Problema que causa en el pipeline: Falta de idempotencia y aislamiento en los tests: tienen dependencias en el estado dejado por otros tests; por lo que pueden fallar incluso aunque la aplicación funcione bien.
- Link al commit:
- Corrección (una o más: mover de etapa / dejar como informativo / eliminar / ajustar configuración / modificar tests): modificar tests
- Evidencia (dato observado, con link al run o fragmento de la salida local):

### Defecto 5

- Job y etapa: load, post-deploy
- Problema que causa en el pipeline: La prueba load es laxa en lo que considera aceptable: un 400 con un cuerpo que indique un problema inesperado puede escaparse (algo distinto a saldo insuficiente). Esto puede ocultar errores funcionales bajo carga.
- Link al commit:
- Corrección (una o más: mover de etapa / dejar como informativo / eliminar / ajustar configuración / modificar tests): modificar tests
- Evidencia (dato observado, con link al run o fragmento de la salida local):

## Parte 2 · Implementación

- Link al run en verde en main:
- Link al pull request:
- Defecto de la aplicación introducido (archivo y descripción):
- Job que debería detenerlo:
- Link al run fallido:

## Parte 3 · Decisión bajo restricción

Link al run medido:

| Job         | Duración (min:seg) |
| ----------- | ------------------ |
| unit        |                    |
| integration |                    |
| sast        |                    |
| sca         |                    |
| build-push  |                    |
| deploy      |                    |
| smoke       |                    |
| e2e         |                    |
| load        |                    |
| **Total**   |                    |

Resultado de load en ese run:
| Métrica | Valor |
|---|---|
| p90 | |
| p95 | |
| Máximo | |
| Tasa de error | |
| Requests por segundo | |

Conclusión sobre el comportamiento bajo carga:

SLO propuesto (percentil, valor, ventana) y justificación:

SLA propuesto y diferencia con el SLO:

Cambios para cumplir el presupuesto:
| Cambio | Job | Minutos recuperados |
|---|---|---|

Total resultante: [ ] min
Link al run en main con los cambios:

Riesgo aceptado (defecto de la aplicación concreto y efecto en la métrica DORA asignada):

Decisión sobre sast (se queda / se mueve a otra etapa o evento / informativo) y razón:

## Declaración de uso de IA

Herramientas usadas y para qué:
Codex, para pensar mejor (guía de dónde podrían estar los defectos), ayudas en completar código (sintaxis) y obtención de evidencias.
