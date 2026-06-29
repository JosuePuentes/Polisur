/** Prefijo para identificar registros de demostración (borrado selectivo). */
export const DEMO_CODE_PREFIX = 'DEMO-';

/** Cédulas de funcionarios ficticios V-99001001 … V-99001099 */
export const DEMO_CEDULA_PREFIX = 'V-99001';

/** Clave por defecto de los usuarios demo (solo entornos de prueba). */
export const DEMO_DEFAULT_PASSWORD = 'Demo2026!';

export const DEMO_OFFICERS = [
  { cedula: 'V-99001001', nombres: 'Carlos', apellidos: 'Mendoza Ríos', grado: 'O/J' },
  { cedula: 'V-99001002', nombres: 'María', apellidos: 'Pérez Salazar', grado: 'O/J' },
  { cedula: 'V-99001003', nombres: 'Luis', apellidos: 'García Torrealba', grado: 'O/J' },
  { cedula: 'V-99001004', nombres: 'Ana', apellidos: 'Rodríguez Lima', grado: 'O/J' },
  { cedula: 'V-99001005', nombres: 'Pedro', apellidos: 'Hernández Mora', grado: 'O/J' },
  { cedula: 'V-99001006', nombres: 'Rosa', apellidos: 'Blanco Jiménez', grado: 'O/J' },
] as const;

export const DEMO_DETAINEES = [
  { cedula: 'V-88002001', nombres: 'José', apellidos: 'Ramírez', alias: 'El flaco' },
  { cedula: 'V-88002002', nombres: 'Miguel', apellidos: 'Soto', alias: null },
  { cedula: 'V-88002003', nombres: 'Andrea', apellidos: 'Castillo', alias: 'La negra' },
] as const;
