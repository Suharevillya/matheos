// Unit table, math.js instance and the display-unit rule, docs/spec/units.md.
import { create, all, type FactoryFunctionMap, type MathJsInstance, type Unit } from 'mathjs';

export const math: MathJsInstance = create(all as FactoryFunctionMap, { number: 'number' });
math.createUnit('Nm', { definition: '1 N m', prefixes: 'short' }); // Nm, kNm, MNm

/** The curated unit table (docs/spec/units.md). Any other math.js unit is `unknown unit`. */
export const UNITS = new Set([
  'mm', 'cm', 'm', 'km', 'g', 'kg', 't', 's', 'N', 'kN', 'MN', 'Nm', 'kNm', 'MNm',
  'Pa', 'kPa', 'MPa', 'GPa', 'rad', 'deg', 'K', 'J', 'kJ', 'W', 'kW',
]);

/** A symbol that math.js would read as a unit but the table does not list. */
export function isForeignUnit(name: string): boolean {
  if (UNITS.has(name) || typeof (math as unknown as Record<string, unknown>)[name] === 'function') return false; // min, max, … resolve as functions first
  return math.Unit.isValuelessUnit(name);
}

// default display unit per dimension vector [mass, length, time, current, temp, lum, amount, angle, bit]
const DEFAULTS: Record<string, string> = {
  '0,1,0,0,0,0,0,0,0': 'mm',
  '0,2,0,0,0,0,0,0,0': 'mm^2',
  '0,3,0,0,0,0,0,0,0': 'mm^3',
  '0,4,0,0,0,0,0,0,0': 'mm^4',
  '1,1,-2,0,0,0,0,0,0': 'kN',
  '1,2,-2,0,0,0,0,0,0': 'kNm',
  '1,0,-2,0,0,0,0,0,0': 'kN/m',
  '1,-1,-2,0,0,0,0,0,0': 'MPa',
  '1,0,0,0,0,0,0,0,0': 'kg',
  '1,-3,0,0,0,0,0,0,0': 'kg/m^3',
  '0,0,0,0,0,0,0,1,0': 'deg',
};

const DISPLAY_NAMES: Record<string, string> = { Nm: 'N·m', kNm: 'kN·m', MNm: 'MN·m' };

export function isUnit(v: unknown): v is Unit {
  return typeof v === 'object' && v !== null && (v as { isUnit?: boolean }).isUnit === true;
}

/** The unit string a value prints in: `to` first, then a single carried table unit, then the dimension default. */
export function displayUnit(u: Unit, to?: string): string {
  if (to) return to;
  if (u.units.length === 1) {
    const [p] = u.units;
    const prefix = p!.prefix as unknown as { name: string } | string;
    const name = (typeof prefix === 'string' ? prefix : prefix.name) + p!.unit.name;
    return p!.power === 1 ? name : `${name}^${p!.power}`;
  }
  const key = u.dimensions.join(',');
  return DEFAULTS[key] ?? u.formatUnits();
}

/** `kN m` / `kNm/m` / `mm^2` -> LaTeX, upright, products with a centred dot, exponents outside \mathrm. */
export function unitLatex(spec: string): string {
  const [num = '', den] = spec.split('/');
  const part = (s: string) =>
    s.trim().split(/[\s*]+/).filter(Boolean).map((f) => {
      const m = /^([A-Za-z°%]+)(?:\^(-?\d+))?$/.exec(f);
      if (!m) return `\\mathrm{${f}}`;
      const name = DISPLAY_NAMES[m[1]!] ?? m[1]!;
      const body = `\\mathrm{${name.replace('·', '{\\cdot}')}}`;
      return m[2] ? `${body}^{${m[2]}}` : body;
    }).join('{\\cdot}');
  if (spec === 'deg') return '^\\circ';
  return den === undefined ? part(num) : `${part(num)}/${part(den)}`;
}

/** Plain-language error wording for the math.js messages the examples hit. */
export function wording(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  let r: RegExpExecArray | null;
  if ((r = /^Undefined symbol (\S+)/.exec(m))) return `undefined name "${r[1]}"`;
  if (/Unexpected type of argument in function (add|subtract)/.test(m)) return 'cannot add a number and a quantity';
  if (/Cannot compare units with different base/.test(m)) return 'cannot compare quantities of different dimension';
  if ((r = /Units do not match \('([^']*)' != '([^']*)'\)/.exec(m))) return `cannot combine ${r[1]} and ${r[2]}`;
  if (/Units do not match/.test(m)) return 'units do not match';
  if ((r = /Unit "([^"]+)" not found/.exec(m))) return `unknown unit "${r[1]}"`;
  return m.replace(/\.$/, '');
}
