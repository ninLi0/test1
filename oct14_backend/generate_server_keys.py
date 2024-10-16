# generate_server_keys.py

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa  # Ensure RSA is imported
from cryptography.hazmat.backends import default_backend

def generate_keys():
    # Generate an RSA private key
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=4096,  # 4096 bits for strong security
        backend=default_backend()
    )

    # Serialize and save the private key
    with open("server_private_key.pem", "wb") as f:
        f.write(
            private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()  # No encryption on the key file
            )
        )

    # Generate the corresponding public key
    public_key = private_key.public_key()

    # Serialize and save the public key
    with open("server_public_key.pem", "wb") as f:
        f.write(
            public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            )
        )

    print("Server RSA key pair generated successfully.")

if __name__ == "__main__":
    generate_keys()
