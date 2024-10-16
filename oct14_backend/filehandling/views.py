# filehandling/views.py

import os
import base64
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from .crypto_utils import (
    decrypt_aes_key,
    decrypt_file_data,
    encrypt_file_data,
)
from django.core.files.storage import default_storage


@csrf_exempt
def get_public_key(request):
    """
    Endpoint to provide the client's public RSA key.
    """
    public_key_pem = settings.PUBLIC_KEY
    print("Public Key Sent to Client:\n", public_key_pem)  # Logging the public key
    return JsonResponse({'public_key': public_key_pem})


import re

@csrf_exempt
def receive_encrypted_key(request):
    print("===== Start of 'receive_encrypted_key' =====")
    print("Request method:", request.method)
    print("Request headers:", request.headers)
    print("Request POST data:", request.POST)

    if request.method != 'POST':
        print("Error: Invalid request method used. Expected POST.")
        return JsonResponse({'error': 'Invalid request method. Use POST.'}, status=405)

    encrypted_aes_key = request.POST.get('encrypted_aes_key')
    if not encrypted_aes_key:
        print("Error: No encrypted AES key provided in the request.")
        return JsonResponse({'error': 'No encrypted AES key provided.'}, status=400)

    print("Encrypted AES Key (raw):\n", encrypted_aes_key)

    # Remove whitespace and line breaks
    encrypted_aes_key_clean = re.sub(r'\s+', '', encrypted_aes_key)
    print("Encrypted AES Key (cleaned):\n", encrypted_aes_key_clean)
    print("Length of encrypted AES key (cleaned):", len(encrypted_aes_key_clean))

    try:
        # Decrypt the AES key using the server's private RSA key
        decrypted_aes_key = decrypt_aes_key(encrypted_aes_key_clean)
        print("Decrypted AES Key successfully.")

        # Optionally, print the length or a hash of the decrypted AES key
        print("Length of decrypted AES key:", len(decrypted_aes_key))
        # Avoid printing the actual key for security reasons

        # Store the decrypted AES key in the session (base64-encoded)
        aes_key_b64 = base64.b64encode(decrypted_aes_key).decode('utf-8')
        request.session['aes_key'] = aes_key_b64
        print("AES key stored in session.")

        print("===== End of 'receive_encrypted_key' (Success) =====\n")
        return JsonResponse({'message': 'AES key received and stored successfully.'}, status=200)
    except Exception as e:
        print("Exception occurred during decryption:", str(e))
        # Optionally, print the traceback for debugging
        import traceback
        traceback.print_exc()
        print("===== End of 'receive_encrypted_key' (Failure) =====\n")
        return JsonResponse({'error': 'Decryption failed.'}, status=500)



# filehandling/views.py

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .crypto_utils import decrypt_file_data
import base64
import os
from django.conf import settings


@csrf_exempt
def upload_file(request):
    """
    Endpoint to handle encrypted file uploads.
    Decrypts the file using the AES key and saves it to the server.
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method. Use POST.'}, status=405)

    try:
        # Retrieve the AES key from the session
        aes_key_b64 = request.session.get('aes_key')
        if not aes_key_b64:
            return JsonResponse({'error': 'AES key not found in session.'}, status=400)
        aes_key = base64.b64decode(aes_key_b64)
        print(f"AES key retrieved: {aes_key}")

        # Retrieve encrypted data and IV from the request
        encrypted_data = request.POST.get('encrypted_data')
        iv_b64 = request.POST.get('iv')  # This is the base64 encoded IV
        file_name = request.POST.get('file_name')

        if not encrypted_data or not iv_b64 or not file_name:
            return JsonResponse({'error': 'Missing encrypted data, IV, or file name.'}, status=400)

        # Decode the IV from base64 to its original 16-byte binary form
        iv_hex = base64.b64decode(iv_b64)
        iv = bytes.fromhex(iv_hex.decode('utf-8'))
        print(f"Base64 Encoded IV: {iv_b64}")
        print(f"Decoded IV (binary): {iv}")
        print(f"IV length: {len(iv)}")  # Should be 16 bytes

        encrypted_data = base64.b64decode(encrypted_data)

        decrypted_file_data = decrypt_file_data(encrypted_data, aes_key, iv)

        decrypted_file_data = base64.b64decode(decrypted_file_data)
        # Save the decrypted file
        save_directory = os.path.join(settings.MEDIA_ROOT, 'uploads')
        os.makedirs(save_directory, exist_ok=True)
        save_path = os.path.join(save_directory, file_name)
        with open(save_path, 'wb') as f:
            f.write(decrypted_file_data)

        return JsonResponse({'message': 'File uploaded and decrypted successfully.', 'file_name': file_name}, status=200)

    except Exception as e:
        print(f"Error during file upload: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)




from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import os
import base64
from Crypto.Cipher import AES

@csrf_exempt
def download_file(request, file_name):
    """
    Endpoint to handle file downloads.
    Encrypts the requested file using the AES key and sends it to the client.
    """
    if request.method != 'GET':
        print("Invalid request method. Only GET is allowed.")
        return JsonResponse({'error': 'Invalid request method. Use GET.'}, status=405)

    try:
        # Retrieve the AES key from the session
        aes_key_b64 = request.session.get('aes_key')
        if not aes_key_b64:
            print("AES key not found in session.")
            return JsonResponse({'error': 'AES key not found in session.'}, status=400)
        
        aes_key = base64.b64decode(aes_key_b64)
        print(f"AES key retrieved: {aes_key}")
        print(f"AES key length: {len(aes_key)} bytes")

        # Path to the file
        file_path = os.path.join(settings.MEDIA_ROOT, 'uploads', file_name)
        print(f"Looking for file at path: {file_path}")

        if not os.path.exists(file_path):
            print(f"File does not exist: {file_path}")
            return JsonResponse({'error': 'File does not exist.'}, status=404)

        # Read the file data
        with open(file_path, 'rb') as f:
            file_data = f.read()
        
        print(f"File '{file_name}' read successfully. File size: {len(file_data)} bytes")

        # Encrypt the file data using AES
        encrypted_data_b64, iv_b64 = encrypt_file_data(file_data, aes_key)
        print("File encrypted successfully.")
        print(f"IV (Base64): {iv_b64}")
        print(f"Encrypted Data (Base64) length: {len(encrypted_data_b64)}")

        # Return the encrypted data and IV as JSON response
        return JsonResponse({
            'encrypted_data': encrypted_data_b64,
            'iv': iv_b64,
            'file_name': file_name
        }, status=200)

    except Exception as e:
        print(f"Error during file download: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)




@csrf_exempt
def list_files(request):
    """
    Endpoint to list all uploaded files.
    """
    if request.method != 'GET':
        return JsonResponse({'error': 'Invalid request method. Use GET.'}, status=405)

    try:
        upload_dir = os.path.join(settings.MEDIA_ROOT, 'uploads')
        files = os.listdir(upload_dir) if os.path.exists(upload_dir) else []
        return JsonResponse({'files': files}, status=200)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
