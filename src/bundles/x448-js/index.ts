import { BigInteger } from "../jsbn/index.js";

function fromNumber(x: number): BigInteger {
  return new BigInteger(x.toString(10));
}

const N0 = BigInteger.ZERO;
const N1 = BigInteger.ONE;
const N2 = fromNumber(2);
const N3 = fromNumber(3);
const N5 = fromNumber(5);
const N128 = fromNumber(128);
const N255 = fromNumber(255);

function sqr(num: BigInteger) {
  return num.multiply(num);
}

// # Defined here https://tools.ietf.org/html/rfc7748#section-5
// P = 2 ** 448 - 2 ** 224 - 1
const P = new BigInteger(
  "726838724295606890549323807888004534353641360687318060281490199180612328166730772686396383698676545930088884461843637361053498018365439",
);
const A24 = new BigInteger("39081");

function cswap(
  swap: BigInteger,
  x_2: BigInteger,
  x_3: BigInteger,
): [BigInteger, BigInteger] {
  const dummy = swap.multiply(x_2.subtract(x_3)).mod(P);
  return [x_2.subtract(dummy).mod(P), x_3.add(dummy).mod(P)];
}

function X448(k: BigInteger, u: BigInteger): BigInteger {
  const x_1 = u;
  let x_2 = N1;
  let z_2 = N0;
  let x_3 = u;
  let z_3 = N1;
  let swap = N0;

  for (let t = 448 - 1; t >= 0; --t) {
    const k_t = k.shiftRight(t).and(N1);
    swap = swap.xor(k_t);
    {
      const [a, b] = cswap(swap, x_2, x_3);
      x_2 = a;
      x_3 = b;
    }
    {
      const [a, b] = cswap(swap, z_2, z_3);
      z_2 = a;
      z_3 = b;
    }
    swap = k_t;

    const A = x_2.add(z_2).mod(P);
    const AA = sqr(A).mod(P);
    const B = x_2.subtract(z_2).mod(P);
    const BB = sqr(B).mod(P);
    const E = AA.subtract(BB).mod(P);
    const C = x_3.add(z_3).mod(P);
    const D = x_3.subtract(z_3).mod(P);
    const DA = D.multiply(A).mod(P);
    const CB = C.multiply(B).mod(P);
    x_3 = sqr(DA.add(CB).mod(P)).mod(P);
    z_3 = x_1.multiply(sqr(DA.subtract(CB).mod(P))).mod(P);
    x_2 = AA.multiply(BB).mod(P);
    z_2 = E.multiply(AA.add(A24.multiply(E).mod(P)).mod(P)).mod(P);
  }

  const [X_2] = cswap(swap, x_2, x_3);
  const [Z_2] = cswap(swap, z_2, z_3);
  return X_2.multiply(Z_2.modPow(P.subtract(N2), P)).mod(P);
}

function decodeLittleEndian(b: number[]): BigInteger {
  return b
    .map((value, i) => fromNumber(value).shiftLeft(8 * i))
    .reduce<BigInteger>((aggr, value) => aggr.add(value), N0);
}

function decodeScalar448(k: number[]): BigInteger {
  const k_list = [...k];
  k_list[0] &= 252;
  k_list[55] |= 128;
  return decodeLittleEndian(k_list);
}

function unpack(s: number[]): BigInteger {
  if (s.length !== 56) {
    throw new Error(`Invalid Curve448 scalar (len=${s.length})`);
  }
  return s
    .map((value, i) => fromNumber(value).shiftLeft(8 * i))
    .reduce<BigInteger>((aggr, value) => aggr.add(value), N0);
}

function pack(n: BigInteger): number[] {
  return Array.from({ length: 56 }, (_, i) =>
    n
      .shiftRight(8 * i)
      .and(N255)
      .intValue());
}

function clamp(n: BigInteger): BigInteger {
  return n.andNot(N3).or(N128.shiftLeft(8 * 55));
}

function multscalar(n: number[], p: number[]): number[] {
  const _n = clamp(decodeScalar448(n));
  const _p = unpack(p);
  return pack(X448(_n, _p));
}

function base_point_mult(n: number[]): number[] {
  const _n = clamp(decodeScalar448(n));
  return pack(X448(_n, N5));
}

/**
 * Calculate X448 public key from private key
 * @param {ArrayLike} privateKey Can be any random generated byte-array of length 56
 * @returns {Array} Public key derived from the {@link privateKey}
 */
export function getPublicKey(
  privateKey: number[] | Uint8Array,
): number[] {
  if (!privateKey) {
    throw new Error("Missing private key");
  }

  if (privateKey.length !== 56) {
    throw new Error(`Invalid Curve448 private key (len=${privateKey.length})`);
  }

  return base_point_mult(Array.from(privateKey));
}

/**
 * Calculate X448 shared secret
 * @param {ArrayLike} privateKey Local private key
 * @param {ArrayLike} publicKey Remote public key (Can be generated using {@link getPublicKey})
 * @returns {Array} Shared secret
 */
export function getSharedSecret(
  privateKey: number[] | Uint8Array,
  publicKey: number[] | Uint8Array,
): number[] {
  if (!privateKey) {
    throw new Error("Missing private key");
  }
  if (!publicKey) {
    throw new Error("Missing public key");
  }
  if (privateKey.length !== 56) {
    throw new Error(`Invalid Curve448 private key (len=${privateKey.length})`);
  }

  const secret = multscalar(Array.from(privateKey), Array.from(publicKey));

  // https://tools.ietf.org/html/rfc7748#section-6.2
  // As with X25519, both sides MAY check, without leaking extra
  //  information about the value of K, whether the resulting shared K is
  //  the all-zero value and abort if so.
  if (!secret.some((x) => x)) {
    throw new Error("Invalid Curve448 public key");
  }

  return secret;
}
