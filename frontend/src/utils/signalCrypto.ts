import * as SignalClient from '@signalapp/libsignal-client';
import { getRandomBytesAsync } from "expo-crypto";
import { fromByteArray, toByteArray } from "base64-js";
import * as SecureStore from 'expo-secure-store';

// Signal Protocol Implementation for OMERTA
export class SignalProtocolManager {
  private identityKeyPair: SignalClient.PrivateKey | null = null;
  private registrationId: number = 0;
  private deviceId: number = 1;

  async initialize(): Promise<void> {
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
  }

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