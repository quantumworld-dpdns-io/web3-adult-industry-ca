from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization
import base64


class CryptoKeywords:
    def generate_ed25519_keypair(self):
        private_key = ed25519.Ed25519PrivateKey.generate()
        public_key = private_key.public_key()
        pub_bytes = public_key.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw,
        )
        pub_b58 = self._b64encode(pub_bytes)
        return pub_b58

    def sign_with_private_key(self, message: str, private_key_pem: str) -> str:
        private_key = serialization.load_pem_private_key(private_key_pem.encode(), password=None)
        signature = private_key.sign(message.encode())
        return base64.b64encode(signature).decode()

    def _b64encode(self, data: bytes) -> str:
        return base64.b64encode(data).decode()
