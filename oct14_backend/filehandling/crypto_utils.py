# filehandling/crypto_utils.py

from Crypto.Cipher import AES, PKCS1_OAEP
from Crypto.PublicKey import RSA
import base64
import os
from django.conf import settings
from Crypto.Cipher import PKCS1_v1_5
from Crypto.PublicKey import RSA
import base64
import logging
from django.conf import settings

def decrypt_aes_key(encrypted_aes_key_b64):
    """
    Decrypts the AES key using the server's private RSA key with PKCS1_v1_5 padding.
    """
    print("===== Start of 'decrypt_aes_key' =====")
    
    try:
        private_key_pem = settings.PRIVATE_KEY
        private_key = RSA.import_key(private_key_pem)
        print("Private RSA key imported successfully.")
    
        # Initialize cipher with PKCS1_v1_5 padding
        cipher_rsa = PKCS1_v1_5.new(private_key)
        print("Initialized RSA cipher with PKCS1_v1_5 padding.")
    
        # Decode the base64-encoded encrypted AES key
        encrypted_aes_key = base64.b64decode(encrypted_aes_key_b64)
        print(f"Encrypted AES key decoded from base64. Length: {len(encrypted_aes_key)} bytes.")
    
        # Decrypt the AES key
        sentinel = b''  # Sentinel value for incorrect decryption
        decrypted_aes_key_hex = cipher_rsa.decrypt(encrypted_aes_key, sentinel)
        print("AES key decrypted.")
    
        if decrypted_aes_key_hex == sentinel:
            print("Error: Incorrect decryption. Possible padding error.")
            raise ValueError("Incorrect decryption.")
    
        print(f"Length of decrypted AES key (hex): {len(decrypted_aes_key_hex)} bytes.")
        
        # Convert hex string to binary bytes
        decrypted_aes_key = bytes.fromhex(decrypted_aes_key_hex.decode('utf-8'))
        print(f"Length of decrypted AES key (binary): {len(decrypted_aes_key)} bytes.")
        
        if len(decrypted_aes_key) != 32:
            print("Warning: Decrypted AES key length is not 32 bytes. Expected 32 bytes for AES-256.")
    
        print("===== End of 'decrypt_aes_key' (Success) =====\n")
        return decrypted_aes_key
    except Exception as e:
        print("Exception occurred in 'decrypt_aes_key':", str(e))
        import traceback
        traceback.print_exc()
        print("===== End of 'decrypt_aes_key' (Failure) =====\n")
        raise


def decrypt_file_data(encrypted_data_b64, aes_key, iv):

    if not isinstance(aes_key, bytes) or not isinstance(iv, bytes) or not isinstance(encrypted_data_b64,bytes):
        raise TypeError("AES key and IV and encrypted data must be bytes.")
    cipher = AES.new(aes_key, AES.MODE_CBC, iv)

    decrypted_data = cipher.decrypt(encrypted_data_b64)

    # Remove PKCS7 padding
    pad_len = decrypted_data[-1]
    decrypted_data = decrypted_data[:-pad_len]

    return decrypted_data


import os
import base64
from Crypto.Cipher import AES

def encrypt_file_data(file_data, aes_key):
    """
    Encrypts the file data using AES-CBC mode.
    """
    try:
        # Generate a random 16-byte IV (Initialization Vector)
        iv = os.urandom(16)
        cipher = AES.new(aes_key, AES.MODE_CBC, iv)

        # Apply PKCS7 padding to ensure data is a multiple of the block size (16 bytes)
        pad_len = 16 - (len(file_data) % 16)
        padding = bytes([pad_len] * pad_len)  # e.g., if pad_len is 3, padding will be \x03\x03\x03
        padded_data = file_data + padding

        # Encrypt the padded data
        encrypted_data = cipher.encrypt(padded_data)

        # Base64 encode the encrypted data and IV
        encrypted_data_b64 = base64.b64encode(encrypted_data).decode('utf-8')
        iv_b64 = base64.b64encode(iv).decode('utf-8')

        # Logging
        print(f"Generated IV (Base64): {iv_b64}")
        print(f"Encrypted data (Base64) sample: {encrypted_data_b64[:60]}...")  # Only showing the first 60 characters

        return encrypted_data_b64, iv_b64

    except Exception as e:
        print(f"Error during encryption: {str(e)}")
        raise
