/**
 * Double-double (DD) arithmetic for high-precision Mandelbrot coordinates.
 *
 * Represents a number as hi + lo where hi, lo are float64 values.
 * This gives ~31 decimal digits of precision, enabling zoom to ~10^30.
 *
 * Algorithms follow Hida/Li/Bailey "Library for Double-Double and Quad-Double Arithmetic"
 * and Shewchuk "Adaptive Precision Floating-Point Arithmetic".
 */

/** A double-double number: value = hi + lo, with |lo| ≤ 0.5 * ulp(hi). */
export type DD = [number, number];

// ─── Error-Free Transformations ─────────────────────────────────

/** Knuth's TwoSum: returns (s, e) such that a + b = s + e exactly. */
export function twoSum(a: number, b: number): DD {
  const s = a + b;
  const v = s - a;
  const e = (a - (s - v)) + (b - v);
  return [s, e];
}

/** Dekker splitting constant: 2^27 + 1 */
const SPLIT = 134217729;

/** Dekker's TwoProd: returns (p, e) such that a * b = p + e exactly. */
export function twoProd(a: number, b: number): DD {
  const p = a * b;
  const ca = a * SPLIT;
  const ah = ca - (ca - a);
  const al = a - ah;
  const cb = b * SPLIT;
  const bh = cb - (cb - b);
  const bl = b - bh;
  const e = ((ah * bh - p) + ah * bl + al * bh) + al * bl;
  return [p, e];
}

// ─── DD Constructors ────────────────────────────────────────────

export function ddFrom(a: number): DD {
  return [a, 0];
}

export function ddToNumber(a: DD): number {
  return a[0] + a[1];
}

// ─── DD Arithmetic ──────────────────────────────────────────────

export function ddAdd(a: DD, b: DD): DD {
  const [s1, s2] = twoSum(a[0], b[0]);
  const [t1, t2] = twoSum(a[1], b[1]);
  let c = s2 + t1;
  const [v1, v2] = twoSum(s1, c);
  c = t2 + v2;
  const [r1, r2] = twoSum(v1, c);
  return [r1, r2];
}

export function ddSub(a: DD, b: DD): DD {
  return ddAdd(a, [-b[0], -b[1]]);
}

export function ddMul(a: DD, b: DD): DD {
  const [p1, p2] = twoProd(a[0], b[0]);
  const e = p2 + (a[0] * b[1] + a[1] * b[0]);
  const [r1, r2] = twoSum(p1, e);
  return [r1, r2];
}

export function ddMulScalar(a: DD, s: number): DD {
  const [p1, p2] = twoProd(a[0], s);
  const e = p2 + a[1] * s;
  const [r1, r2] = twoSum(p1, e);
  return [r1, r2];
}

// ─── Reference Orbit Computation ────────────────────────────────

/**
 * Compute a Mandelbrot reference orbit at double-double precision.
 *
 * The orbit Z[n] is computed by iterating Z = Z² + C where C = (cx, cy)
 * is the center coordinate in DD precision. The Z values are stored as
 * float32 for upload to the GPU texture.
 *
 * @returns Float32Arrays of x and y orbit values, plus the orbit length.
 */
export function computeReferenceOrbit(
  cx: DD,
  cy: DD,
  maxIter: number
): { xn: Float32Array; yn: Float32Array; length: number } {
  const xn = new Float32Array(maxIter + 1);
  const yn = new Float32Array(maxIter + 1);

  let zx: DD = [0, 0];
  let zy: DD = [0, 0];

  xn[0] = 0;
  yn[0] = 0;

  for (let i = 0; i < maxIter; i++) {
    const zx2 = ddMul(zx, zx);
    const zy2 = ddMul(zy, zy);
    const zxzy = ddMul(zx, zy);

    zx = ddAdd(ddSub(zx2, zy2), cx);
    zy = ddAdd(ddMulScalar(zxzy, 2), cy);

    const zxNum = ddToNumber(zx);
    const zyNum = ddToNumber(zy);

    xn[i + 1] = zxNum;  // auto-truncated to float32
    yn[i + 1] = zyNum;

    // Escape check (with large bailout to ensure reference outlasts pixel orbits)
    if (zxNum * zxNum + zyNum * zyNum > 1e8) {
      return { xn, yn, length: i + 1 };
    }
  }

  return { xn, yn, length: maxIter };
}
