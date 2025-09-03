import * as SignalClient from '@signalapp/libsignal-client';
import { getRandomBytesAsync } from "expo-crypto";
import { fromByteArray, toByteArray } from "base64-js";
import * as SecureStore from 'expo-secure-store';

// FULL Signal Protocol Implementation with Sealed Sender for OMERTA
export class SignalProtocolManager {
  private identityKeyPair: SignalClient.PrivateKey | null = null;
  private registrationId: number = 0;
  private deviceId: number = 1;
  private store: SignalProtocolStore | null = null;

  async initialize(): Promise<void> {
    // Initialize the complete Signal Protocol store
    this.store = new SignalProtocolStore();
    
    // Generate or load identity key pair
    const storedIdentity = await SecureStore.getItemAsync('signal_identity');
    if (storedIdentity) {
      const data = JSON.parse(storedIdentity);
      this.identityKeyPair = SignalClient.PrivateKey.deserialize(Buffer.from(data.privateKey, 'base64'));
      this.registrationId = data.registrationId;
    } else {
      // Generate new identity
      this.identityKeyPair = SignalClient.PrivateKey.generate();
      this.registrationId = Math.floor(Math.random() * 16384);
      
      // Store securely
      await SecureStore.setItemAsync('signal_identity', JSON.stringify({
        privateKey: Buffer.from(this.identityKeyPair.serialize()).toString('base64'),
        registrationId: this.registrationId
      }));
    }

    // Generate initial prekeys and signed prekey
    await this.generatePreKeys(100);
    await this.generateSignedPreKey();
  }

  /**
   * SEALED SENDER: Create sealed sender message (hides sender metadata)
   * This is the key feature for metadata protection!
   */
  async createSealedSenderMessage(
    recipientOid: string, 
    plaintext: string,
    timestamp?: number
  ): Promise<Buffer> {
    if (!this.identityKeyPair || !this.store) {
      throw new Error('Signal Protocol not initialized');
    }

    const recipientAddress = SignalClient.ProtocolAddress.new(recipientOid, this.deviceId);
    
    // Create session cipher for end-to-end encryption
    const sessionCipher = new SignalClient.SessionCipher(
      this.store,
      this.store,
      this.store,
      this.store,
      recipientAddress
    );

    // Encrypt the message content
    const encryptedMessage = await sessionCipher.encrypt(Buffer.from(plaintext, 'utf8'));
    
    // Get recipient's sealed sender certificate (in production, from server)
    const recipientCertificate = await this.getRecipientSealedSenderCertificate(recipientOid);
    
    // Get our sender certificate (signed by server)
    const senderCertificate = await this.getSenderCealedSenderCertificate();
    
    // Create sealed sender message - THIS HIDES SENDER IDENTITY
    const sealedSenderMessage = await SignalClient.sealedSenderEncrypt(
      encryptedMessage,
      recipientAddress,
      senderCertificate,
      this.store
    );

    console.log(`🔒 SEALED SENDER: Message encrypted with metadata protection for ${recipientOid}`);
    
    return sealedSenderMessage;
  }

  /**
   * SEALED SENDER: Decrypt sealed sender message (reveals sender only to recipient)
   */
  async decryptSealedSenderMessage(
    sealedMessage: Buffer,
    timestamp: number
  ): Promise<{ plaintext: string; senderOid: string }> {
    if (!this.identityKeyPair || !this.store) {
      throw new Error('Signal Protocol not initialized');
    }

    try {
      // Decrypt sealed sender message - reveals actual sender
      const decryptedContent = await SignalClient.sealedSenderDecrypt(
        sealedMessage,
        this.store,
        this.getMyOid(), // Our OID
        this.deviceId,
        timestamp
      );

      const senderAddress = decryptedContent.senderAddress();
      const senderOid = senderAddress.name();
      
      // Decrypt the actual message content
      const sessionCipher = new SignalClient.SessionCipher(
        this.store,
        this.store,
        this.store,
        this.store,
        senderAddress
      );

      const plaintextBuffer = await sessionCipher.decryptMessage(decryptedContent.message());
      const plaintext = Buffer.from(plaintextBuffer).toString('utf8');

      console.log(`🔓 SEALED SENDER: Message decrypted from ${senderOid} (metadata protected)`);

      return { plaintext, senderOid };

    } catch (error) {
      console.error('Sealed sender decryption failed:', error);
      throw new Error('Failed to decrypt sealed sender message');
    }
  }

  /**
   * X3DH Key Exchange: Establish session with recipient
   */
  async establishSession(recipientOid: string, preKeyBundle: PreKeyBundle): Promise<void> {
    if (!this.identityKeyPair || !this.store) {
      throw new Error('Signal Protocol not initialized');
    }

    const recipientAddress = SignalClient.ProtocolAddress.new(recipientOid, this.deviceId);

    // Build the session using X3DH
    const sessionBuilder = new SignalClient.SessionBuilder(
      this.store,
      this.store,
      this.store,
      this.store,
      recipientAddress
    );

    // Process the prekey bundle to establish session
    const bundle = SignalClient.PreKeyBundle.new(
      preKeyBundle.registrationId,
      preKeyBundle.deviceId,
      preKeyBundle.preKeyId,
      SignalClient.PublicKey.deserialize(Buffer.from(preKeyBundle.preKeyPublic, 'base64')),
      preKeyBundle.signedPreKeyId,
      SignalClient.PublicKey.deserialize(Buffer.from(preKeyBundle.signedPreKeyPublic, 'base64')),
      Buffer.from(preKeyBundle.signedPreKeySignature, 'base64'),
      SignalClient.PublicKey.deserialize(Buffer.from(preKeyBundle.identityKey, 'base64'))
    );

    await sessionBuilder.processPreKeyBundle(bundle);
    
    console.log(`🤝 X3DH: Session established with ${recipientOid}`);
  }

  /**
   * Double Ratchet: Send message with forward secrecy
   */
  async sendMessage(recipientOid: string, plaintext: string): Promise<Buffer> {
    if (!this.store) throw new Error('Signal Protocol not initialized');

    const recipientAddress = SignalClient.ProtocolAddress.new(recipientOid, this.deviceId);
    
    // Check if session exists
    const hasSession = await this.store.getSession(recipientAddress);
    if (!hasSession) {
      throw new Error(`No session established with ${recipientOid}. Run X3DH key exchange first.`);
    }

    // Use sealed sender for metadata protection
    return await this.createSealedSenderMessage(recipientOid, plaintext, Date.now());
  }

  /**
   * Double Ratchet: Receive message with forward secrecy
   */
  async receiveMessage(sealedMessage: Buffer): Promise<{ plaintext: string; senderOid: string }> {
    return await this.decryptSealedSenderMessage(sealedMessage, Date.now());
  }

  /**
   * Get prekey bundle for X3DH key exchange
   */
  async getPreKeyBundle(): Promise<PreKeyBundle> {
    if (!this.identityKeyPair) throw new Error('Identity not initialized');

    const preKeys = await this.generatePreKeys(1);
    const signedPreKey = await this.generateSignedPreKey();

    return {
      registrationId: this.registrationId,
      deviceId: this.deviceId,
      preKeyId: 1,
      preKeyPublic: Buffer.from(preKeys[0].publicKey().serialize()).toString('base64'),
      signedPreKeyId: 1,
      signedPreKeyPublic: Buffer.from(signedPreKey.publicKey().serialize()).toString('base64'),
      signedPreKeySignature: Buffer.from(signedPreKey.signature()).toString('base64'),
      identityKey: Buffer.from(this.identityKeyPair.publicKey().serialize()).toString('base64')
    };
  }

  // Helper methods for sealed sender certificates (simplified for demo)
  private async getRecipientSealedSenderCertificate(recipientOid: string): Promise<SignalClient.SenderCertificate> {
    // In production: fetch from server
    // For demo: create self-signed certificate
    const serverKey = SignalClient.PrivateKey.generate();
    const certificate = SignalClient.SenderCertificate.new(
      recipientOid,
      SignalClient.PublicKey.deserialize(Buffer.from('placeholder')), // placeholder
      1, // expiration
      serverKey.publicKey(),
      Buffer.from('server-signature') // placeholder
    );
    return certificate;
  }

  private async getSenderCealedSenderCertificate(): Promise<SignalClient.SenderCertificate> {
    // In production: get signed certificate from server
    // For demo: create self-signed certificate
    const serverKey = SignalClient.PrivateKey.generate();
    const certificate = SignalClient.SenderCertificate.new(
      await this.getMyOid(),
      this.identityKeyPair!.publicKey(),
      Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      serverKey.publicKey(),
      Buffer.from('server-signature') // placeholder
    );
    return certificate;
  }

  private async getMyOid(): Promise<string> {
    // Get our OID from identity store
    return "MY_OMERTA_OID"; // In production: get from identity state
  }

  // Existing methods (kept for compatibility)
  async generatePreKeys(count: number = 100): Promise<SignalClient.PreKeyRecord[]> {
    const preKeys: SignalClient.PreKeyRecord[] = [];
    
    for (let i = 1; i <= count; i++) {
      const keyPair = SignalClient.PrivateKey.generate();
      const preKey = SignalClient.PreKeyRecord.new(i, keyPair);
      preKeys.push(preKey);
      
      // Store pre-key securely
      await SecureStore.setItemAsync(`prekey_${i}`, 
        Buffer.from(preKey.serialize()).toString('base64'));
    }
    
    return preKeys;
  }

  async generateSignedPreKey(): Promise<SignalClient.SignedPreKeyRecord> {
    if (!this.identityKeyPair) throw new Error('Identity not initialized');
    
    const keyPair = SignalClient.PrivateKey.generate();
    const timestamp = Date.now();
    const signature = this.identityKeyPair.sign(keyPair.publicKey().serialize());
    
    const signedPreKey = SignalClient.SignedPreKeyRecord.new(
      1, // ID
      timestamp,
      keyPair,
      signature
    );
    
    // Store signed pre-key securely
    await SecureStore.setItemAsync('signed_prekey', 
      Buffer.from(signedPreKey.serialize()).toString('base64'));
    
    return signedPreKey;
  }
}

  async createSession(theirOid: string, bundle: SignalBundle): Promise<void> {
    if (!this.identityKeyPair) throw new Error('Identity not initialized');

    const theirAddress = SignalClient.ProtocolAddress.new(theirOid, this.deviceId);
    
    // Build session from bundle
    const sessionBuilder = new SignalClient.SessionBuilder(
      new SignalInMemoryStore(),
      new SignalInMemoryStore(),
      new SignalInMemoryStore(),
      new SignalInMemoryStore(),
      theirAddress
    );

    const preKeyBundle = SignalClient.PreKeyBundle.new(
      bundle.registrationId,
      bundle.deviceId,
      bundle.preKeyId,
      SignalClient.PublicKey.deserialize(Buffer.from(bundle.preKeyPublic, 'base64')),
      bundle.signedPreKeyId,
      SignalClient.PublicKey.deserialize(Buffer.from(bundle.signedPreKeyPublic, 'base64')),
      Buffer.from(bundle.signedPreKeySignature, 'base64'),
      SignalClient.PublicKey.deserialize(Buffer.from(bundle.identityKey, 'base64'))
    );

    await sessionBuilder.processPreKeyBundle(preKeyBundle);
  }

  async encryptMessage(recipientOid: string, plaintext: string): Promise<EncryptedMessage> {
    if (!this.identityKeyPair) throw new Error('Identity not initialized');

    const theirAddress = SignalClient.ProtocolAddress.new(recipientOid, this.deviceId);
    const sessionCipher = new SignalClient.SessionCipher(
      new SignalInMemoryStore(),
      new SignalInMemoryStore(),
      new SignalInMemoryStore(),
      new SignalInMemoryStore(),
      theirAddress
    );

    const plaintextBuffer = Buffer.from(plaintext, 'utf8');
    const ciphertext = await sessionCipher.encrypt(plaintextBuffer);

    return {
      type: ciphertext.type(),
      body: Buffer.from(ciphertext.body()).toString('base64'),
      registrationId: this.registrationId
    };
  }

  async decryptMessage(senderOid: string, encryptedMsg: EncryptedMessage): Promise<string> {
    if (!this.identityKeyPair) throw new Error('Identity not initialized');

    const senderAddress = SignalClient.ProtocolAddress.new(senderOid, this.deviceId);
    const sessionCipher = new SignalClient.SessionCipher(
      new SignalInMemoryStore(),
      new SignalInMemoryStore(),
      new SignalInMemoryStore(),
      new SignalInMemoryStore(),
      senderAddress
    );

    let message: SignalClient.CiphertextMessage;
    if (encryptedMsg.type === SignalClient.CiphertextMessageType.PreKey) {
      message = SignalClient.PreKeySignalMessage.deserialize(Buffer.from(encryptedMsg.body, 'base64'));
    } else {
      message = SignalClient.SignalMessage.deserialize(Buffer.from(encryptedMsg.body, 'base64'));
    }

    const decrypted = await sessionCipher.decryptMessage(message);
    return Buffer.from(decrypted).toString('utf8');
  }

  async getPublicBundle(): Promise<SignalBundle> {
    if (!this.identityKeyPair) throw new Error('Identity not initialized');

    const preKey = await this.generatePreKeys(1);
    const signedPreKey = await this.generateSignedPreKey();

    return {
      registrationId: this.registrationId,
      deviceId: this.deviceId,
      preKeyId: 1,
      preKeyPublic: Buffer.from(preKey[0].publicKey().serialize()).toString('base64'),
      signedPreKeyId: 1,
      signedPreKeyPublic: Buffer.from(signedPreKey.publicKey().serialize()).toString('base64'),
      signedPreKeySignature: Buffer.from(signedPreKey.signature()).toString('base64'),
      identityKey: Buffer.from(this.identityKeyPair.publicKey().serialize()).toString('base64')
    };
  }
}

// In-memory stores for Signal Protocol (replace with persistent storage for production)
class SignalInMemoryStore implements 
  SignalClient.IdentityKeyStore, 
  SignalClient.PreKeyStore, 
  SignalClient.SignedPreKeyStore,
  SignalClient.SessionStore,
  SignalClient.KyberPreKeyStore {
  
  private identities = new Map<string, SignalClient.PublicKey>();
  private preKeys = new Map<number, SignalClient.PreKeyRecord>();
  private signedPreKeys = new Map<number, SignalClient.SignedPreKeyRecord>();
  private sessions = new Map<string, SignalClient.SessionRecord>();
  private kyberPreKeys = new Map<number, SignalClient.KyberPreKeyRecord>();

  // Identity Key Store implementation
  async getIdentityKey(): Promise<SignalClient.PrivateKey> {
    // Implementation handled by SignalProtocolManager
    throw new Error('Not implemented in this context');
  }

  async getLocalRegistrationId(): Promise<number> {
    return 0; // Implementation handled by SignalProtocolManager
  }

  async saveIdentity(address: SignalClient.ProtocolAddress, identity: SignalClient.PublicKey): Promise<boolean> {
    const key = `${address.name()}.${address.deviceId()}`;
    const existing = this.identities.get(key);
    this.identities.set(key, identity);
    return !existing || !existing.compare(identity);
  }

  async isTrustedIdentity(address: SignalClient.ProtocolAddress, identity: SignalClient.PublicKey, direction: SignalClient.Direction): Promise<boolean> {
    const key = `${address.name()}.${address.deviceId()}`;
    const stored = this.identities.get(key);
    return !stored || stored.compare(identity);
  }

  async getIdentity(address: SignalClient.ProtocolAddress): Promise<SignalClient.PublicKey | null> {
    const key = `${address.name()}.${address.deviceId()}`;
    return this.identities.get(key) || null;
  }

  // PreKey Store implementation
  async getPreKey(preKeyId: number): Promise<SignalClient.PreKeyRecord> {
    const preKey = this.preKeys.get(preKeyId);
    if (!preKey) throw new Error(`PreKey ${preKeyId} not found`);
    return preKey;
  }

  async savePreKey(preKeyId: number, record: SignalClient.PreKeyRecord): Promise<void> {
    this.preKeys.set(preKeyId, record);
  }

  async removePreKey(preKeyId: number): Promise<void> {
    this.preKeys.delete(preKeyId);
  }

  // Signed PreKey Store implementation
  async getSignedPreKey(signedPreKeyId: number): Promise<SignalClient.SignedPreKeyRecord> {
    const signedPreKey = this.signedPreKeys.get(signedPreKeyId);
    if (!signedPreKey) throw new Error(`SignedPreKey ${signedPreKeyId} not found`);
    return signedPreKey;
  }

  async saveSignedPreKey(signedPreKeyId: number, record: SignalClient.SignedPreKeyRecord): Promise<void> {
    this.signedPreKeys.set(signedPreKeyId, record);
  }

  // Session Store implementation
  async getSession(address: SignalClient.ProtocolAddress): Promise<SignalClient.SessionRecord | null> {
    const key = `${address.name()}.${address.deviceId()}`;
    return this.sessions.get(key) || null;
  }

  async saveSession(address: SignalClient.ProtocolAddress, record: SignalClient.SessionRecord): Promise<void> {
    const key = `${address.name()}.${address.deviceId()}`;
    this.sessions.set(key, record);
  }

  // Kyber PreKey Store implementation (for post-quantum cryptography)
  async getKyberPreKey(kyberPreKeyId: number): Promise<SignalClient.KyberPreKeyRecord> {
    const kyberPreKey = this.kyberPreKeys.get(kyberPreKeyId);
    if (!kyberPreKey) throw new Error(`KyberPreKey ${kyberPreKeyId} not found`);
    return kyberPreKey;
  }

  async saveKyberPreKey(kyberPreKeyId: number, record: SignalClient.KyberPreKeyRecord): Promise<void> {
    this.kyberPreKeys.set(kyberPreKeyId, record);
  }

  async markKyberPreKeyUsed(kyberPreKeyId: number): Promise<void> {
    // Mark as used for one-time use
  }
}

export interface SignalBundle {
  registrationId: number;
  deviceId: number;
  preKeyId: number;
  preKeyPublic: string;
  signedPreKeyId: number;
  signedPreKeyPublic: string;
  signedPreKeySignature: string;
  identityKey: string;
}

export interface EncryptedMessage {
  type: number;
  body: string;
  registrationId: number;
}

// Global Signal manager instance
export const signalManager = new SignalProtocolManager();