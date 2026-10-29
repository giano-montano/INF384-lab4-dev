# Respuestas · Laboratorio 4

Alumno: 20212662
Presupuesto: [11] min Métrica DORA: [change failure rate]

## Parte 1 · Diagnóstico

### Defecto 1

- Job y etapa: smoke, etapa deploy en el pipeline original (en paralelo con deploy); pasa a post-deploy con la corrección.
- Problema que causa en el pipeline: No asegurar que la prueba smoke se realiza tras haberse desplegado la aplicación
- Link al commit: https://github.com/giano-montano/INF384-lab4-dev/commit/0c24cb8476aff693a21676b275f74f74f2665d77
- Corrección (una o más: mover de etapa / dejar como informativo / eliminar / ajustar configuración / modificar tests): mover de etapa y ajustar configuración (`smoke.needs: deploy`).
- Evidencia (dato observado, con link al run o fragmento de la salida local): En el [run original del 29/10](https://github.com/giano-montano/INF384-lab4-dev/actions/runs/40955576152), deploy comenzó a las 21:12:29 UTC y terminó a las 21:12:52; smoke comenzó a las 21:12:30. Los jobs se solaparon durante 22 s. En el [run corregido del 29/10](https://github.com/giano-montano/INF384-lab4-dev/actions/runs/40969714654), deploy terminó a las 22:58:57 UTC y smoke comenzó a las 22:58:59, después de deploy. Los tiempos originales demuestran el paralelismo; no afirman que ese run concreto haya probado una versión anterior.

### Defecto 2

- Job y etapa: Smoke, post-deploy
- Problema que causa en el pipeline: El smoke omite la comprobación de identidad porque no recibe EXPECTED_COMMIT. Puede quedar verde aunque la URL responda con una versión distinta de la construida por el run.
- Link al commit: https://github.com/giano-montano/INF384-lab4-dev/commit/7addd367a215fb01f2be80ad0a95a1dbcd081f15
- Corrección (una o más: mover de etapa / dejar como informativo / eliminar / ajustar configuración / modificar tests): ajustar configuración
- Evidencia (dato observado, con link al run o fragmento de la salida local): En el [job smoke corregido](https://github.com/giano-montano/INF384-lab4-dev/actions/runs/40969714654/job/123783673973), el log muestra a las 22:59:07 UTC `commit: c373417142d3b6db6a9c65b59dfd5bb4eee2674f`, exactamente el head SHA del run. Esa línea se imprime tras superar la comparación con EXPECTED_COMMIT. En el job original no aparecía esa línea de comprobación.

### Defecto 3

- Job y etapa: e2e, post-deploy.
- Problema que causa en el pipeline: El job instala Chromium y sus dependencias, y los tests solicitan una página de navegador para comprobar una API HTTP; sin embargo solo leen el JSON de la respuesta. Esto agrega tiempo de instalación y ejecución sin verificar un comportamiento que requiera navegador.
- Link al commit: https://github.com/giano-montano/INF384-lab4-dev/commit/f6ae45fc174fae6eb9c90ee761bb6bc316f7f13e
- Corrección (una o más: mover de etapa / dejar como informativo / eliminar / ajustar configuración / modificar tests): modificar tests, eliminar y ajustar configuración.
- Evidencia (dato observado, con link al run o fragmento de la salida local): En el [e2e original](https://github.com/giano-montano/INF384-lab4-dev/actions/runs/40955576152/job/123735678941), el paso Navegador duró 20 s (21:13:16 a 21:13:36 UTC), y Playwright informó `10 passed (5.4s)`. En el [e2e corregido](https://github.com/giano-montano/INF384-lab4-dev/actions/runs/40969714654/job/123783755989), ya no existe ese paso y el log informa `10 passed (2.1s)`. La duración total del job pasó de 48 s a 17 s; 20 s del run original correspondían específicamente a instalar Chromium y sus dependencias.

### Defecto 4

- Job y etapa: integration, pre-build
- Problema que causa en el pipeline: Falta de aislamiento e independencia entre tests: dependen del estado dejado por pruebas anteriores y pueden fallar al ejecutarse individualmente aunque la aplicación funcione bien.
- Link al commit: https://github.com/giano-montano/INF384-lab4-dev/commit/ae3cebdf17a996dcc4091dd8efc70b1c09fbfe67
- Corrección (una o más: mover de etapa / dejar como informativo / eliminar / ajustar configuración / modificar tests): modificar tests
- Evidencia (dato observado, con link al run o fragmento de la salida local): Ejecuté el test aislado con SQLite real y una base nueva, recuperando la versión anterior del commit f6ae45f. El test original falla con `actual: 200`, `expected: 400`: Ana todavía tiene sus S/ 1000 iniciales. Con el test corregido pasa, porque prepara dentro del mismo escenario la transferencia previa de S/ 100. La suite corregida también pasó dos ejecuciones locales consecutivas con `12 tests`, `12 pass`, `0 fail`. El [job integration corregido en Actions](https://github.com/giano-montano/INF384-lab4-dev/actions/runs/40969714654/job/123783115694) confirma `# tests 12`, `# pass 12`, `# fail 0`.

  Comando del test aislado, ejecutado sobre cada versión:

  ```powershell
  node --test --test-reporter=tap --test-name-pattern="ana no puede transferir 950" test/integration/transferir.test.js
  ```

  Fragmentos observados:

  ```text
  ANTES, base nueva y test original:
  not ok 1 - ana no puede transferir 950
      200 !== 400
    expected: 400
    actual: 200
  # pass 0
  # fail 1

  DESPUÉS, test corregido:
  ok 1 - ana no puede transferir 950
  # pass 1
  # fail 0
  ```

### Defecto 5

- Job y etapa: load, post-deploy
- Problema que causa en el pipeline: La prueba load es laxa en lo que considera aceptable: un 400 con un cuerpo que indique un problema inesperado puede escaparse (algo distinto a saldo insuficiente). Esto puede ocultar errores funcionales bajo carga.
- Link al commit: https://github.com/giano-montano/INF384-lab4-dev/commit/c373417142d3b6db6a9c65b59dfd5bb4eee2674f
- Corrección (una o más: mover de etapa / dejar como informativo / eliminar / ajustar configuración / modificar tests): modificar tests
- Evidencia (dato observado, con link al run o fragmento de la salida local): Ejecuté localmente un harness con Node y `node:vm` que evalúa los checks reales de las versiones anterior y corregida con respuestas controladas. Para `400 {"error":"usuario inexistente"}`, el check anterior devolvió `true` y el corregido `false`; para `400 {"error":"saldo insuficiente"}`, ambos devolvieron `true`. También se rechazaron JSON inválido y una respuesta 200 con monto incorrecto. Se verificaron 9 casos. El [comando reproducible y su salida](evidencias/defecto5.md) identifican expresamente esta simulación. Además, el [job load corregido](https://github.com/giano-montano/INF384-lab4-dev/actions/runs/40969714654/job/123783755983), ejecutado realmente contra Lambda el 29/10, concluyó con success e informó `checks_succeeded: 100.00% 35254 out of 35254`, `checks_failed: 0.00% 0 out of 35254` y `✓ transferir devuelve un resultado valido`. La simulación demuestra el rechazo del error inesperado; el run confirma que la aplicación correcta supera los checks bajo carga.

## Parte 2 · Implementación

- Link al run en verde en main: https://github.com/giano-montano/INF384-lab4-dev/actions/runs/40969714654. Concluyó con success el 29/10 a las 23:11:24 UTC, con los nueve jobs en verde. Corresponde a c373417142d3b6db6a9c65b59dfd5bb4eee2674f, cuyo historial contiene los cinco commits de la Parte 1.
- Link al pull request: https://github.com/giano-montano/INF384-lab4-dev/pull/1. Base: main del fork giano-montano/INF384-lab4-dev. Rama: parte2-rechazo-saldo-exacto. Se mantiene abierto, sin merge.
- Defecto de la aplicación introducido (archivo y descripción): En src/wallet.js, commit [8883c1e](https://github.com/giano-montano/INF384-lab4-dev/commit/8883c1ec90d481d96903e533a0eb126a5c0e0c55), se cambia `cuentaOrigen.saldo < centimos` por `cuentaOrigen.saldo <= centimos`. Así, una cuenta con S/ 5 rechaza transferir S/ 5 con HTTP 400 y `saldo insuficiente`, aunque tiene saldo suficiente para transferirlo todo.
- Job que debería detenerlo: unit, etapa pre-build. El test existente `transferir todo el saldo deja el origen en cero` debe fallar. Se observó `not ok 22 - transferir todo el saldo deja el origen en cero`, `error: 'saldo insuficiente'`, `# tests 28`, `# pass 27`, `# fail 1`. integration también falló; build-push y deploy quedaron omitidos.
- Link al run fallido: https://github.com/giano-montano/INF384-lab4-dev/actions/runs/40969979592. El [job unit aparece en rojo](https://github.com/giano-montano/INF384-lab4-dev/actions/runs/40969979592/job/123784029065). Run iniciado el 29/10 a las 22:59:51 UTC y concluido con failure.

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
Codex, para guiar la identificación de defectos, completar las correcciones de pruebas de API, integración y carga, ejecutar comprobaciones locales, consultar logs de Actions y redactar evidencias. También se utilizó para preparar la rama y el PR con el defecto intencional de la Parte 2 y verificar que el pipeline lo detectara. Los cambios se revisaron durante el trabajo del laboratorio.
