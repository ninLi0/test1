// cryptoUtils.ts

import axios from 'axios';
import { RSA } from 'react-native-rsa-native';
import Aes from 'react-native-aes-crypto';
import { Alert } from 'react-native';
import * as Keychain from 'react-native-keychain';

let publicKeyCache: string | null = null;

/**
 * Fetches the server's public RSA key from the backend.
 * Caches the key to avoid redundant network requests.
 * @returns The public key in PEM format or null if failed.
 */
export const fetchPublicKey = async (): Promise<string | null> => {
  try {
    const response = await axios.get('http://10.29.155.121:8000/filehandling/get-public-key/', {
      timeout: 10000, // 10 seconds timeout
    });

    if (!response.data || !response.data.public_key) {
      throw new Error('Public key not found in the response.');
    }

    const { public_key } = response.data;
    publicKeyCache = public_key;
    console.log('Public Key fetched successfully.');
    return public_key;
  } catch (error: any) {
    console.error('Error fetching public key:', error);
    Alert.alert('Error', 'Failed to fetch public key from the server.');
    return null;
  }
};

/**
 * Generates a random AES key.
 * @returns A 512-bit AES key in hexadecimal format or null if failed.
 */
export const generateAESKey = async (): Promise<string | null> => {
  try {
    const key = await Aes.randomKey(32); // 32 bytes = 256 bits
    console.log('AES Key generated successfully.');
    return key;
  } catch (error: any) {
    console.error('Error generating AES key:', error);
    Alert.alert('Error', 'Failed to generate AES key.');
    return null;
  }
};

/**
 * Encrypts the AES key using the server's public RSA key.
 * @param aesKey The AES key to encrypt.
 * @returns The encrypted AES key in base64 format or null if failed.
 */
export const encryptAESKey = async (aesKey: string): Promise<string | null> => {
  try {
    if (!publicKeyCache) {
      const fetchedPublicKey = await fetchPublicKey();
      if (!fetchedPublicKey) {
        throw new Error('Public key is not available.');
      }
    }

    const encryptedAESKey = await RSA.encrypt(aesKey, publicKeyCache!);
    console.log('AES Key encrypted successfully.');
    return encryptedAESKey; // Base64 encoded string
  } catch (error: any) {
    console.error('Error encrypting AES key:', error);
    Alert.alert('Error', 'Failed to encrypt AES key.');
    return null;
  }
};

/**
 * Sends the encrypted AES key to the server.
 * @param encryptedAESKey The encrypted AES key in base64 format.
 * @returns True if the key was sent successfully, else false.
 */

import { Base64 } from 'js-base64';

export const sendEncryptedAESKey = async (encryptedAESKey: string): Promise<boolean> => {
  try {
    // Do NOT Base64-encode the encrypted AES key again
    // const encryptedAESKeyBase64 = Base64.encode(encryptedAESKey); // Remove this line

    // Prepare form data
    const formData = new FormData();
    formData.append('encrypted_aes_key', encryptedAESKey);

    const response = await axios.post(
      'http://10.29.155.121:8000/filehandling/receive_encrypted_key/',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 10000,
      }
    );

    if (response.status === 200) {
      console.log('Encrypted AES key sent successfully:', response.data);
      return true;
    } else {
      throw new Error('Server returned an error.');
    }
  } catch (error: any) {
    console.error('Error sending encrypted AES key:', error);
    Alert.alert('Error', 'Failed to send encrypted AES key to the server.');
    return false;
  }
};


/**
 * Saves the AES key securely using react-native-keychain.
 * @param aesKey The AES key to save.
 * @returns True if saved successfully, else false.
 */
export const saveAESKeySecurely = async (aesKey: string): Promise<boolean> => {
  try {
    await Keychain.setGenericPassword('aes_key', aesKey);
    console.log('AES key saved securely.');
    return true;
  } catch (error: any) {
    console.error('Error saving AES key securely:', error);
    Alert.alert('Error', 'Failed to save AES key securely.');
    return false;
  }
};

/**
 * Retrieves the AES key from secure storage.
 * @returns The AES key in hexadecimal format or null if not found.
 */
export const retrieveAESKey = async (): Promise<string | null> => {
  try {
    const credentials = await Keychain.getGenericPassword();
    if (credentials && credentials.username === 'aes_key') {
      console.log('AES key retrieved securely.');
      return credentials.password;
    } else {
      console.log('No AES key found in secure storage.');
      return null;
    }
  } catch (error: any) {
    console.error('Error retrieving AES key:', error);
    Alert.alert('Error', 'Failed to retrieve AES key.');
    return null;
  }
};


/**
 * Deletes the AES key from secure storage.
 * @returns True if deletion was successful, else false.
 */
export const deleteAESKeySecurely = async (): Promise<boolean> => {
  try {
    console.log('Deleting AES key from secure storage...');
    await Keychain.resetGenericPassword();
    console.log('AES key deleted successfully.');
    Alert.alert('Info', 'AES key deleted from secure storage.');
    return true;
  } catch (error: any) {
    console.log('Error deleting AES key:', error.message);
    Alert.alert('Error', 'Failed to delete AES key from secure storage.');
    return false;
  }
};