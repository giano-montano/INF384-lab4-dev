# Respuestas · Laboratorio 4

Alumno: 20212662
Presupuesto: 11 min. Métrica DORA: change failure rate.

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

Link al run medido: https://github.com/giano-montano/INF384-lab4-dev/actions/runs/40969714654 (el run en verde de la Parte 2).

Duraciones calculadas como completed_at menos started_at de cada job, consultadas en la API de GitHub Actions. La duración del laboratorio es la suma de los jobs, aunque algunos se ejecuten en paralelo.

| Job         | Duración (min:seg) |
| ----------- | ------------------ |
| unit        | 00:14              |
| integration | 00:10              |
| sast        | 00:18              |
| sca         | 00:21              |
| build-push  | 00:38              |
| deploy      | 00:19              |
| smoke       | 00:11              |
| e2e         | 00:17              |
| load        | 12:12              |
| **Total**   | **14:40**          |

Resultado de load en ese run:

| Métrica | Valor |
|---|---|
| p90 | 66,88 ms |
| p95 | 69,07 ms |
| Máximo | 332,84 ms |
| Tasa de error HTTP según k6 | 0,00 % (0 de 35 254) |
| Requests por segundo | 48,925106 req/s |

Fuente: [resumen final de k6](https://github.com/giano-montano/INF384-lab4-dev/actions/runs/40969714654/job/123783755983). Se completaron 17 627 iteraciones y 35 254 requests, con el 100 % de los checks aprobados. La métrica http_req_failed considera esperados los estados 200 y 400; el check de transferencia distingue si el contenido del 400 corresponde a saldo insuficiente.

Conclusión sobre el comportamiento bajo carga:

En esta ejecución, con una meseta de 30 usuarios virtuales, el sistema sostuvo aproximadamente 48,93 requests/s sin errores HTTP inesperados ni checks fallidos. El 95 % de las duraciones HTTP medidas quedó en aproximadamente 69,07 ms o menos, cercano al p90 de 66,88 ms. El máximo de 332,84 ms muestra que hubo respuestas aisladas más lentas, aunque el p95 se mantuvo muy por debajo del umbral configurado entonces (500 ms). Estos datos describen esta carga y esta ejecución; no establecen la capacidad máxima del servicio ni garantizan su comportamiento ante más usuarios o durante un mes de operación.

SLO propuesto (percentil, valor, ventana) y justificación:

Objetivo de validación en CI: p95 de http_req_duration menor a 200 ms, calculado sobre todos los requests de cada ejecución completa de load. Tras el ajuste, la ventana de cada corrida es de aproximadamente 7 minutos: 1 minuto de subida, 5 minutos constantes con 30 usuarios virtuales y 1 minuto de bajada. Incluye las llamadas GET /saldo y POST /transferir, sin separar percentiles por endpoint.

El valor de 200 ms es aproximadamente 2,9 veces el p95 observado (69,07 ms), por lo que deja margen para variaciones entre ejecuciones, pero es más exigente que los 500 ms originales. El máximo observado de 332,84 ms no contradice este objetivo: un p95 no exige que todos los requests terminen antes de 200 ms. Se configura SLO_P95: 200 en ci.yml; el script lo aplica mediante p(95)<200. En el [run final ajustado](https://github.com/giano-montano/INF384-lab4-dev/actions/runs/40976952876/job/123807931713), el threshold se cumplió con p95 = 70,20 ms, 19 210 requests y 0,00 % de errores HTTP y de checks. Esto valida el objetivo en esa corrida, sin permitir inferir por sí solo el comportamiento en producción.

SLA propuesto y diferencia con el SLO:

Como compromiso propuesto para clientes, p95 de latencia HTTP menor a 300 ms durante cada mes calendario, medido sobre requests válidos del tráfico real de producción, con un crédito del 5 % de la cuota mensual si se incumple. Es una propuesta de acuerdo para el caso, no un compromiso ya acreditado por las mediciones del laboratorio.

El SLO es el objetivo interno que usamos para validar cambios en CI. El SLA es un compromiso externo con una ventana de medición definida y una consecuencia por incumplimiento. Se propone un valor externo menos exigente (300 ms frente a 200 ms) para conservar margen operativo antes de incumplir el acuerdo; además, el SLA se evalúa durante un mes de tráfico real y el SLO de este pipeline durante una carga sintética de 7 minutos. Su cumplimiento mensual requeriría medición continua en producción y no puede demostrarse con este único run.

Cambios para cumplir el presupuesto:

| Cambio | Job | Minutos recuperados |
|---|---|---|
| Reducir la etapa de carga constante de 10 a 5 minutos, manteniendo 30 usuarios virtuales y las rampas de 1 minuto | load | 4:58 observados: el job pasó de 12:12 a 7:14 |
| Ajustar SLO_P95 de 500 a 200 ms | load | 0:00 de ahorro atribuido; aumenta la exigencia de la validación, no es la fuente del ahorro |

La duración inicial sumó 880 s (14:40). La estimación previa al run final fue 580 s (9:40), suponiendo constantes los demás tiempos. El total realmente observado fue 604 s (10:04): se recuperaron 276 s (4:36) en el conjunto del pipeline. load ahorró 298 s (4:58), mientras los otros jobs sumaron 22 s adicionales entre ambas ejecuciones. La variación de sus duraciones explica que el ahorro total sea menor al de load.

La meseta conserva 5 minutos, por encima del mínimo de 4. load sigue ejecutándose en cada run de main, con su threshold de latencia y los checks funcionales; el job deploy se conserva.

Total resultante observado: **10:04**, menor al presupuesto de **11:00**, con **00:56 de margen**.
Link al run en main con los cambios: https://github.com/giano-montano/INF384-lab4-dev/actions/runs/40976952876. Head SHA: 96a24461cb25687295df650ce7e8cf9f1e29cea7. Los nueve jobs concluyeron con success.

El run se inició el **29/10/2026 a las 19:01:05 de Lima (UTC-5)** y terminó a las 19:10:16. GitHub registra su inicio como 30/10 a las 00:01:05 UTC; corresponde al 29/10 en la zona horaria del laboratorio.

Duraciones finales, calculadas con el mismo criterio que el run de referencia:

| Job | Duración final (min:seg) |
|---|---:|
| unit | 00:12 |
| integration | 00:12 |
| sast | 00:18 |
| sca | 00:20 |
| build-push | 00:47 |
| deploy | 00:23 |
| smoke | 00:14 |
| e2e | 00:24 |
| load | 07:14 |
| **Total** | **10:04** |

Riesgo aceptado (defecto de la aplicación concreto y efecto en la métrica DORA asignada):

Acepto reducir la capacidad de detectar defectos que requieren carga prolongada para manifestarse. Un ejemplo concreto sería una regresión en src/db.js que retenga objetos de cada transferencia en una colección global y provoque una fuga de memoria. Si bajo esta carga los errores 500 por agotamiento de memoria aparecen recién después de 8 minutos constantes, la meseta original de 10 minutos podría detectarlos y la nueva de 5 minutos dejaría de detectarlos durante este run. Este es un defecto hipotético aceptado como riesgo, no un fallo observado en el código actual.

Dirección esperada de la métrica asignada, change failure rate: sube ante ese tipo de regresión que escape del pipeline, porque una mayor proporción de despliegues podría requerir rollback o una corrección urgente al fallar después en operación. No se afirma que el CFR ya haya aumentado ni se calcula un porcentaje sin datos de despliegues e incidentes. Se mantienen unit, integration, SAST, SCA, smoke, E2E y la carga de 5 minutos para conservar las demás verificaciones dentro del presupuesto.

Decisión sobre sast (se queda / se mueve a otra etapa o evento / informativo) y razón:

Se queda como validación bloqueante en pre-build, con las reglas y severidad ERROR actuales. Su job costó 18 s (0,30 minutos) tanto en el run de referencia como en el final, aproximadamente el 2,7 % del presupuesto de 11 minutos. El ahorro al acortar load permite conservarlo: el total final medido de 10:04 ya incluye esos 18 s y cumple el presupuesto.

Mantener SAST antes de build-push permite detener patrones de código inseguros antes de desplegar. Frente a eliminarlo o dejarlo como informativo, se espera reducir el riesgo de que lleguen a operación cambios que requieran una corrección urgente, contribuyendo a contener el change failure rate. Conservarlo no implica una mejora de CFR medida respecto del pipeline actual, porque su comportamiento se mantiene. Moverlo después de deploy permitiría detectar esos hallazgos más tarde; para este presupuesto, el ahorro de 18 s no justifica aceptar ese riesgo adicional.
## Declaración de uso de IA

Herramientas usadas y para qué:
Codex, para guiar la identificación de defectos, completar las correcciones de pruebas de API, integración y carga, ejecutar comprobaciones locales, consultar logs de Actions y redactar evidencias. También se utilizó para preparar la rama y el PR con el defecto intencional de la Parte 2 y verificar que el pipeline lo detectara. En la Parte 3 ayudó a registrar duraciones y métricas, proponer el SLO y SLA, ajustar la duración de carga y redactar el riesgo aceptado y la decisión sobre SAST. Los cambios se revisaron durante el trabajo del laboratorio.
