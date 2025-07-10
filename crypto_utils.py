from cryptography.fernet import Fernet
import os

KEY_FILE = "secret.key"

def generate_key():
    if not os.path.exists(KEY_FILE):
        with open(KEY_FILE, "wb") as f:
            f.write(Fernet.generate_key())

def load_key():
    return open(KEY_FILE, "rb").read()

def encrypt_password(password):
    return Fernet(load_key()).encrypt(password.encode()).decode()

def decrypt_password(token):
    return Fernet(load_key()).decrypt(token.encode()).decode()