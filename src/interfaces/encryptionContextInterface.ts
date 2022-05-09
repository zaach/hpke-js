import type { Exporter } from './exporter';

/**
 * The encryption context interface for a recipient and a sender.
 *
 * @public
 */
export interface EncryptionContextInterface extends Exporter {

  /** 
   * Encrypts and authenticates a plain text with associated data
   * using a symmetric key and a nonce.
   */
  seal(data: ArrayBuffer, aad?: ArrayBuffer): Promise<ArrayBuffer>;

  /** 
   * Decrypts a ciphertext using associated data with with associated
   * data using a symmetric key and a nonce.
   */
  open(data: ArrayBuffer, aad?: ArrayBuffer): Promise<ArrayBuffer>;

  /**
   * Sets up bi-directional encryption to allow a recipient to send
   * encrypted messages to a sender.
   */
  setupBidirectional(keySeed: ArrayBuffer, nonceSeed: ArrayBuffer): Promise<void>;

}

/**
 * @public
 */
export type RecipientContextInterface = EncryptionContextInterface;

/**
 * @public
 */
export interface SenderContextInterface extends EncryptionContextInterface {

  /// The encapsulated key generated by the sender.
  enc: ArrayBuffer;
}
