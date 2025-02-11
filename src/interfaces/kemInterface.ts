import type { RecipientContextParams } from "./recipientContextParams.ts";
import type { SenderContextParams } from "./senderContextParams.ts";

import { Kem } from "../identifiers.ts";

/**
 * The KEM interface.
 */
export interface KemInterface {
  /** The KEM identifier. */
  readonly id: Kem;
  /** The length in bytes of a KEM shared secret produced by this KEM (Nsecret). */
  readonly secretSize: number;
  /** The length in bytes of an encapsulated key produced by this KEM (Nenc). */
  readonly encSize: number;
  /** The length in bytes of an encoded public key for this KEM (Npk). */
  readonly publicKeySize: number;
  /** The length in bytes of an encoded private key for this KEM (Nsk). */
  readonly privateKeySize: number;

  encap(
    params: SenderContextParams,
  ): Promise<{ sharedSecret: ArrayBuffer; enc: ArrayBuffer }>;

  decap(params: RecipientContextParams): Promise<ArrayBuffer>;
}
