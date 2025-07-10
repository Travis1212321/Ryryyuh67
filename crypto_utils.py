from cryptography.fernet import Fernet

KEY_FILE = "secret.key"

def generate_key():
    if not os.path.exists(KEY_FILE):
        key = Fernet.generate_key()
        with open(KEY_FILE, "wb") as f:
            f.write(key)

def load_key():
    return open(KEY_FILE, "rb").read()

def encrypt_password(password: str) -> str:
    return Fernet(load_key()).encrypt(password.encode()).decode()

def decrypt_password(token: str) -> str:
    return Fernet(load_key()).decrypt(token.encode()).decode()
