// Contenido demo 100 % original (modo mock). No se genera a partir de enlaces del usuario.
import type { ArticleWithDoses } from '../../domain/contract';
import { chunkText } from '../../domain/chunker';
import { newId } from '../../lib/ids';

export interface DemoSource {
  title: string;
  category: string;
  summaryPoints: string[];
  text: string;
  quiz: { question: string; options: string[]; correctIndex: number; explanation: string };
}

export const DEMO_SOURCES: readonly DemoSource[] = [
  {
    title: 'Por qué leer en dosis cortas funciona',
    category: 'Hábitos',
    summaryPoints: [
      'La atención sostenida se agota: descansar antes de fatigarse rinde más que resistir.',
      'Una meta pequeña y cercana es más fácil de empezar que una lectura interminable.',
      'Cerrar cada dosis con una pregunta ayuda a recordar lo leído.',
    ],
    quiz: {
      question: '¿Qué ventaja principal tiene leer en tramos breves?',
      options: ['Se empieza con menos resistencia y se evita la fatiga', 'Se lee siempre más rápido', 'No hace falta repasar nada'],
      correctIndex: 0,
      explanation: 'Un objetivo corto reduce la barrera de entrada y permite descansar antes de que caiga la atención.',
    },
    text: `Casi todos hemos abierto un texto largo con la mejor intención y lo hemos cerrado a los pocos minutos sin haber entendido demasiado. No es falta de disciplina. La atención sostenida funciona como un músculo que se fatiga, y forzarla durante periodos largos produce lecturas superficiales en las que los ojos avanzan pero la mente ya se ha ido a otra parte.

Dividir un texto en tramos breves cambia las reglas del juego. Cuando sabes que solo tienes que leer durante un par de minutos, empezar cuesta menos. La meta es pequeña, concreta y está al alcance de la mano. Esa sensación de poder terminar es una de las razones por las que las listas de tareas cortas se cumplen más que los proyectos enormes, y el mismo principio se aplica a la lectura.

Los descansos también importan. Muchas personas esperan a estar agotadas para parar, y entonces la recuperación es lenta. Detenerse un momento antes de la fatiga, aunque sea para respirar y mirar por la ventana, permite volver con la atención casi intacta. Es lo mismo que hacen los deportistas cuando reparten el esfuerzo en series en lugar de correr sin parar hasta el límite.

Otro beneficio es la memoria. Recordar lo leído requiere un pequeño esfuerzo de recuperación: intentar explicar con tus palabras lo que acabas de leer, o responder una pregunta sencilla. Si haces esa pausa al final de cada tramo, la información tiene muchas más probabilidades de quedarse. Si lees veinte páginas seguidas, lo más probable es que al final solo retengas la última parte y las ideas más llamativas.

Por último, leer en dosis permite adaptarse a la vida real. No siempre tenemos una hora libre, pero casi siempre tenemos tres minutos en una fila, en el transporte o antes de dormir. Un texto que ya está preparado en fragmentos pequeños convierte esos huecos en avance real, sin esfuerzo de organización y sin la culpa de dejar algo a medias.

La idea no es leer menos, sino leer mejor. Con tramos cortos, pausas deliberadas y un pequeño repaso al final de cada uno, es posible avanzar con constancia en textos que antes parecían imposibles. Lo importante es empezar, y la forma más fácil de empezar es que el primer paso sea pequeño.`,
  },
  {
    title: 'El sueño como aliado del aprendizaje',
    category: 'Bienestar',
    summaryPoints: [
      'Durante el sueño el cerebro ordena y consolida lo aprendido durante el día.',
      'Dormir poco empeora la atención y la memoria más de lo que solemos notar.',
      'Repasar brevemente antes de dormir puede reforzar lo estudiado.',
    ],
    quiz: {
      question: '¿Qué ocurre con lo aprendido mientras dormimos?',
      options: ['El cerebro lo consolida y lo reorganiza', 'Se borra por completo', 'Se vuelve más difícil de recordar'],
      correctIndex: 0,
      explanation: 'El sueño participa en la consolidación de la memoria: ordena y fija la información reciente.',
    },
    text: `Solemos pensar que aprender ocurre únicamente mientras estudiamos, pero buena parte del trabajo se completa cuando dormimos. Durante la noche, el cerebro repasa y reorganiza la información recibida durante el día, refuerza las conexiones que considera útiles y deja ir detalles que no parecen importantes. Este proceso se conoce como consolidación de la memoria.

Por eso una noche en vela antes de un examen suele ser mala idea. Quien sacrifica el sueño para estudiar unas horas más recibe más información, pero reduce su capacidad de fijarla. Además, la falta de descanso empeora la atención, la paciencia y el estado de ánimo, de modo que incluso las horas extra de estudio resultan menos productivas de lo que parecen.

Los especialistas recomiendan que los adultos duerman entre siete y nueve horas, aunque las necesidades varían de una persona a otra. Más importante que una cifra exacta es la regularidad: acostarse y levantarse aproximadamente a la misma hora ayuda al cuerpo a anticipar el descanso y a dormir con mayor profundidad.

Algunas costumbres sencillas ayudan. Reducir el uso de pantallas en la última hora del día, mantener el dormitorio oscuro y fresco, y evitar las comidas pesadas o la cafeína por la tarde son cambios pequeños con un efecto apreciable. Ninguno es mágico por sí solo, pero juntos crean un entorno favorable para descansar mejor.

También se puede aprovechar el sueño de forma consciente. Dedicar diez minutos a repasar las ideas principales antes de acostarse, sin presión y sin intentar memorizar, puede favorecer que esa información sea una de las que el cerebro decida reforzar durante la noche. Es un repaso ligero, no una sesión de estudio adicional.

Dormir bien no es un lujo ni una pérdida de tiempo. Es una parte del aprendizaje tan importante como leer, practicar o preguntar. Cuidar el descanso es, en la práctica, cuidar la memoria y la capacidad de concentrarse al día siguiente.`,
  },
  {
    title: 'Cómo tomar notas que sí sirven',
    category: 'Estudio',
    summaryPoints: [
      'Anotar todo literalmente casi nunca ayuda; conviene reformular con tus palabras.',
      'Las preguntas al margen convierten las notas en una herramienta de repaso.',
      'Revisar las notas pronto evita que se olviden a los pocos días.',
    ],
    quiz: {
      question: '¿Qué hace que una nota sea más útil?',
      options: ['Reformular la idea con palabras propias', 'Copiarla tal cual aparece', 'Escribir la mayor cantidad posible'],
      correctIndex: 0,
      explanation: 'Reformular obliga a comprender la idea, lo que mejora tanto la comprensión como el recuerdo.',
    },
    text: `Tomar notas parece una tarea sencilla, pero muchas personas lo hacen de una forma que apenas les ayuda. El error más común es copiar casi palabra por palabra lo que se lee o se escucha. Se acumulan páginas llenas de texto, pero la mente ha trabajado poco: ha actuado como una fotocopiadora y no como un lector que entiende.

Una mejor estrategia consiste en reformular. Después de leer un párrafo, detente y escribe la idea principal con tus propias palabras, en una o dos frases. Si no eres capaz, es una señal valiosa: significa que todavía no la has entendido bien y conviene releer. Reformular obliga a comprender, y comprender es la base de recordar.

Las preguntas son otra herramienta poderosa. En lugar de escribir solo afirmaciones, anota al margen preguntas que puedas responder más adelante, como por qué ocurre algo o en qué se diferencia una cosa de otra. Al repasar, taparás la respuesta e intentarás contestar de memoria. Ese esfuerzo de recuperación fortalece el recuerdo mucho más que volver a leer en silencio.

El formato importa menos de lo que se cree. Algunas personas prefieren esquemas, otras mapas de ideas y otras listas sencillas. Lo esencial es que sea un sistema que puedas mantener y revisar. Unas notas muy bonitas que nunca se vuelven a abrir son menos útiles que unas notas rápidas que se repasan con regularidad.

Hablando de repasar, el momento también cuenta. Revisar las notas el mismo día o al día siguiente evita que se pierdan los detalles, que empiezan a desvanecerse en pocas horas. Un repaso breve a los tres días y otro a la semana suelen bastar para fijar lo importante sin dedicar mucho tiempo.

Al final, las buenas notas no son un registro completo de lo que pasó, sino un mapa personal para volver a entenderlo. Escribe menos, piensa más, formula preguntas y vuelve a ellas con un poco de antelación. Con esos cuatro hábitos, tus apuntes dejarán de ser un archivo y se convertirán en una herramienta de aprendizaje.`,
  },
];

// Convierte las fuentes demo en artículos completos con el algoritmo de fragmentación del contrato.
export function buildDemoArticles(
  targetDoseMinutes: 1.5 | 2.5 | 3.5 = 2.5,
  options: { now?: Date; idGen?: () => string } = {},
): ArticleWithDoses[] {
  const idGen = options.idGen ?? newId;
  const now = options.now ?? new Date();
  return DEMO_SOURCES.map((src, index) => {
    const articleId = idGen();
    const chunks = chunkText(src.text, targetDoseMinutes);
    const doses = chunks.map((c, position) => ({
      id: idGen(),
      articleId,
      position,
      title: null,
      content: c.content,
      estMinutes: c.estMinutes,
      // El quiz demo se asocia a la última dosis.
      quiz:
        position === chunks.length - 1
          ? { id: idGen(), question: src.quiz.question, options: src.quiz.options, correctIndex: src.quiz.correctIndex, explanation: src.quiz.explanation }
          : null,
    }));
    return {
      id: articleId,
      title: src.title,
      category: src.category,
      sourceType: 'demo' as const,
      sourceUrl: null,
      summaryPoints: src.summaryPoints,
      totalMinutes: Math.round(doses.reduce((n, d) => n + d.estMinutes, 0) * 10) / 10,
      doseCount: doses.length,
      bookmarked: false,
      aiProvider: null,
      aiModel: null,
      createdAt: new Date(now.getTime() - index * 60_000).toISOString(),
      doses,
    };
  });
}
