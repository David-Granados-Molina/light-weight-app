## graphify

Este proyecto tiene un grafo de conocimiento en graphify-out/ con nodos clave (god nodes), estructura de comunidades y relaciones entre archivos.

Reglas:
- Para preguntas sobre el código, ejecuta primero `graphify query "<pregunta>"` cuando exista graphify-out/graph.json. Usa `graphify path "<A>" "<B>"` para relaciones y `graphify explain "<concepto>"` para conceptos concretos. Estos comandos devuelven un subgrafo acotado, normalmente mucho más pequeño que GRAPH_REPORT.md o una búsqueda con grep en bruto.
- Si existe graphify-out/wiki/index.md, úsalo para navegación general en vez de explorar el código fuente directamente.
- Lee graphify-out/GRAPH_REPORT.md solo para una revisión de arquitectura amplia o cuando query/path/explain no den suficiente contexto.
- Después de modificar código, ejecuta `graphify update .` para mantener el grafo actualizado (solo AST, sin coste de API).
