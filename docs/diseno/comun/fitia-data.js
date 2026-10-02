(function(){
const E = (nombre, tipo, nivel, dosis, descanso, segura, equipo, p, s, pasos, errores, porque) => ({ nombre, tipo, nivel, dosis, descanso, segura, equipo, musculos: { p, s }, pasos, errores, porque });
const EJ = {
  banda: E('Caminata en banda inclinada', 'Cardio', 'Principiante', '15 min', '—', true, 'Banda', ['Glúteos', 'Cuádriceps'], ['Pantorrillas', 'Core'], ['Sube la inclinación a 4–6 % y camina a un ritmo en el que puedas hablar.', 'Mantén el tronco erguido y no te agarres de las barandas.', 'Da pasos cortos y apoya primero el talón.'], ['Colgarse de las barandas: carga la espalda baja.', 'Inclinar el tronco hacia adelante.'], 'Es cardio de bajo impacto: quemas calorías para bajar de peso sin el golpe que el trote le da a tu zona lumbar.'),
  bici: E('Bicicleta estática', 'Cardio', 'Principiante', '10 min', '—', true, 'Bicicleta', ['Cuádriceps', 'Glúteos'], ['Isquiotibiales'], ['Ajusta el sillín a la altura de tu cadera.', 'Pedalea con resistencia media y la espalda recta.', 'Mantén una cadencia constante.'], ['Sillín muy bajo: dobla la espalda y carga las rodillas.', 'Encorvarte sobre el manubrio.'], 'Sube tus pulsaciones sentada y con apoyo, sin impacto para la espalda.'),
  plancha: E('Plancha en rodillas', 'Core', 'Principiante', '3 × 20 s', '40 s', true, 'Colchoneta', ['Abdomen', 'Transverso'], ['Hombros', 'Glúteos'], ['Apoya antebrazos y rodillas en la colchoneta.', 'Alinea cabeza, espalda y cadera.', 'Aprieta abdomen y glúteos, y respira sin soltar.'], ['Hundir la cadera: arquea la zona lumbar.', 'Aguantar la respiración.'], 'Fortalece el core que protege tu columna. En rodillas, la carga es justa para tu nivel.'),
  perro: E('Perro de caza', 'Core', 'Principiante', '3 × 10 / lado', '45 s', true, 'Colchoneta', ['Core', 'Glúteos'], ['Espalda baja', 'Hombros'], ['En cuatro apoyos: manos bajo hombros, rodillas bajo cadera.', 'Estira brazo derecho y pierna izquierda a la vez.', 'Sostén 2 segundos y cambia de lado.'], ['Girar la cadera al levantar la pierna.', 'Subir la pierna más alto que la cadera.'], 'Entrena la estabilidad de tu espalda baja sin comprimirla. Es de los más recomendados para molestia lumbar.'),
  bicho: E('Bicho muerto', 'Core', 'Principiante', '3 × 10', '45 s', true, 'Colchoneta', ['Abdomen'], ['Flexores de cadera'], ['Boca arriba, brazos al techo y rodillas a 90°.', 'Baja brazo y pierna contrarios sin despegar la espalda del suelo.', 'Vuelve al centro y cambia de lado.'], ['Despegar la zona lumbar del suelo.', 'Hacerlo rápido.'], 'Trabaja el abdomen con la espalda apoyada: no hay forma de arquearla.'),
  sentadilla: E('Sentadilla a cajón', 'Fuerza', 'Principiante', '3 × 12', '60 s', true, 'Cajón o banco', ['Cuádriceps', 'Glúteos'], ['Core', 'Isquiotibiales'], ['Párate frente al cajón, pies al ancho de hombros.', 'Baja llevando la cadera atrás hasta rozar el cajón.', 'Empuja con los talones para subir.'], ['Rodillas hacia adentro.', 'Dejarte caer sobre el cajón.'], 'El cajón marca la profundidad: bajas segura y sin curvar la espalda. Ideal para quemar calorías ganando fuerza.'),
  puente: E('Puente de glúteo', 'Fuerza', 'Principiante', '3 × 15', '45 s', true, 'Colchoneta', ['Glúteos'], ['Isquiotibiales', 'Core'], ['Boca arriba, rodillas dobladas y pies apoyados.', 'Aprieta glúteos y sube la cadera hasta alinear rodillas, cadera y hombros.', 'Sostén 2 segundos y baja lento.'], ['Subir de más y arquear la espalda.', 'Empujar con la punta de los pies.'], 'Glúteos fuertes le quitan trabajo a tu espalda baja. Es clave para tu molestia lumbar.'),
  prensa: E('Prensa de piernas', 'Fuerza', 'Principiante', '3 × 12', '60 s', true, 'Máquina de prensa', ['Cuádriceps', 'Glúteos'], ['Isquiotibiales'], ['Siéntate con la espalda completamente apoyada.', 'Pies al ancho de hombros en la plataforma.', 'Baja hasta 90° de rodilla y empuja sin bloquear.'], ['Despegar la cadera del asiento.', 'Bajar demasiado: la pelvis se curva.'], 'Fuerza de pierna con la espalda apoyada: la máquina te sostiene mientras ganas fuerza.'),
  zancada: E('Zancada estática con apoyo', 'Fuerza', 'Intermedio', '3 × 10 / lado', '60 s', false, 'Pared o barra', ['Cuádriceps', 'Glúteos'], ['Core'], ['Da un paso largo y apóyate con una mano en la pared.', 'Baja la rodilla de atrás hacia el piso.', 'Sube empujando con la pierna de adelante.'], ['Inclinar el tronco hacia adelante.', 'Rodilla de adelante pasando la punta del pie.'], 'Trabaja cada pierna por separado. Mantén el tronco recto; si te molesta la espalda, cámbialo por puente de glúteo.'),
  talones: E('Elevación de talones', 'Fuerza', 'Principiante', '3 × 15', '30 s', true, 'Escalón', ['Pantorrillas'], ['Tobillos'], ['Párate en el borde de un escalón, con apoyo.', 'Sube en puntas lo más alto que puedas.', 'Baja lento por debajo del escalón.'], ['Rebotar.', 'Doblar las rodillas.'], 'Cierra la sesión de pierna sin carga sobre la columna.'),
  gato: E('Gato-camello', 'Movilidad', 'Principiante', '2 × 10', '30 s', true, 'Colchoneta', ['Columna'], ['Core'], ['En cuatro apoyos, espalda neutra.', 'Exhala y redondea la espalda hacia el techo.', 'Inhala y hunde suave el abdomen, mirando al frente.'], ['Forzar el rango.', 'Moverte rápido.'], 'Mueve tu columna vértebra por vértebra y alivia la rigidez lumbar.'),
  rotacion: E('Rotación de tronco en el suelo', 'Movilidad', 'Principiante', '2 × 8 / lado', '30 s', true, 'Colchoneta', ['Oblicuos', 'Columna'], ['Glúteos'], ['Boca arriba, rodillas dobladas y brazos en cruz.', 'Deja caer las rodillas juntas hacia un lado.', 'Vuelve al centro y cambia.'], ['Despegar los hombros del suelo.', 'Dejar caer las rodillas de golpe.'], 'Suelta la tensión de la zona lumbar con un movimiento suave y controlado.'),
  rodilla: E('Rodilla al pecho', 'Movilidad', 'Principiante', '3 × 30 s', '20 s', true, 'Colchoneta', ['Espalda baja'], ['Glúteos'], ['Boca arriba, lleva una rodilla al pecho con las manos.', 'Deja la otra pierna estirada o doblada.', 'Sostén 30 segundos respirando y cambia.'], ['Jalar con fuerza.', 'Levantar la cabeza.'], 'Estira la espalda baja y la cadera: alivio rápido después de entrenar.'),
  nino: E('Postura del niño', 'Movilidad', 'Principiante', '3 × 40 s', '20 s', true, 'Colchoneta', ['Espalda baja', 'Dorsales'], ['Cadera'], ['De rodillas, siéntate sobre los talones.', 'Estira los brazos al frente y baja el pecho.', 'Respira profundo hacia la espalda baja.'], ['Forzar si te molestan las rodillas: pon un cojín.'], 'Descansa y estira la zona lumbar. Perfecta para cerrar la sesión.'),
  plancha_lat: E('Plancha lateral en rodillas', 'Core', 'Intermedio', '3 × 15 s / lado', '40 s', true, 'Colchoneta', ['Oblicuos'], ['Glúteo medio'], ['De lado, apoya antebrazo y rodillas.', 'Sube la cadera hasta alinear el cuerpo.', 'Sostén y cambia de lado.'], ['Dejar caer la cadera.', 'Codo lejos del hombro.'], 'Los oblicuos estabilizan la columna de lado a lado.'),
  superman: E('Superman alterno', 'Core', 'Intermedio', '3 × 8 / lado', '45 s', false, 'Colchoneta', ['Espalda baja', 'Glúteos'], ['Hombros'], ['Boca abajo, brazos estirados al frente.', 'Levanta brazo y pierna contrarios unos centímetros.', 'Baja lento y cambia.'], ['Levantar de más: comprime la zona lumbar.'], 'Fortalece la espalda baja, pero solo cuando la molestia es leve. Por ahora no está en tu rutina.')
};
Object.keys(EJ).forEach(k => { EJ[k].id = k; });
const RUT = {
  ia: [
    { n: 1, dow: 'LUN', fecha: '28 sep', title: 'Cardio suave + core', ids: ['banda', 'bici', 'plancha', 'perro', 'bicho'] },
    { n: 2, dow: 'MIÉ', fecha: '30 sep', title: 'Fuerza tren inferior', ids: ['sentadilla', 'puente', 'prensa', 'zancada', 'talones'] },
    { n: 3, dow: 'VIE', fecha: '2 oct', title: 'Movilidad lumbar', ids: ['gato', 'rotacion', 'rodilla', 'nino', 'banda'] }
  ],
  ia2: [
    { n: 1, dow: 'LUN', fecha: '28 sep', title: 'Cardio suave + core', ids: ['bici', 'banda', 'bicho', 'plancha', 'perro'] },
    { n: 2, dow: 'MIÉ', fecha: '30 sep', title: 'Fuerza tren inferior', ids: ['sentadilla', 'puente', 'prensa', 'talones', 'perro'] },
    { n: 3, dow: 'VIE', fecha: '2 oct', title: 'Movilidad lumbar', ids: ['gato', 'rodilla', 'rotacion', 'nino', 'bici'] }
  ],
  base: [
    { n: 1, dow: 'LUN', fecha: '28 sep', title: 'Caminata + core suave', ids: ['banda', 'plancha', 'perro'] },
    { n: 2, dow: 'MIÉ', fecha: '30 sep', title: 'Fuerza básica', ids: ['sentadilla', 'puente', 'talones'] },
    { n: 3, dow: 'VIE', fecha: '2 oct', title: 'Movilidad lumbar', ids: ['gato', 'rodilla', 'nino'] }
  ]
};
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const PESOS = [];
for (let d = 0; d <= 60; d += 3) {
  let v = d <= 30 ? 81 - 1.5 * d / 30 : 79.5 - 1.5 * (d - 30) / 30;
  if (d % 30 !== 0) v += 0.28 * Math.sin(d * 1.3) + 0.12 * Math.cos(d * 0.7);
  const dt = new Date(2026, 7, 1 + d);
  PESOS.push({ d, v: Math.round(v * 10) / 10, f: dt.getDate() + ' ' + MES[dt.getMonth()] });
}
const SEM = [[2, 6], [2, 5.5], [3, 5], [2, 4.5], [3, 4.5], [3, 4], [2, 3.5], [3, 3.5], [1, 3]].map((w, i) => ({ l: 'S' + (i + 1), n: w[0], dolor: w[1] }));
const USER = { nombre: 'Laura', apellido: 'Gómez', edad: 28, sexo: 'Mujer', peso: 78, estatura: 165, molestias: ['Lumbar'], severidad: 'Moderada', actividad: 'Sedentaria', objetivo: 'Bajar de peso', dias: 3, minutos: 45, correo: 'laura.gomez@correo.co', celular: '310 555 0142', gym: 'Gimnasio La 68 · Engativá' };

window.FITIA_DATA={EJ,RUT,PESOS,SEM,USER,MES};
})();
