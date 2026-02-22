from passlib.context import CryptContext

# Configuración para encriptar contraseñas con bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Generar hash para la contraseña "Admin123!"
hashed_password = pwd_context.hash("Admin123!")

print("=" * 60)
print("NUEVO HASH PARA 'Admin123!':")
print(hashed_password)
print("=" * 60)
print("\n👉 COPIA este hash largo y úsalo en el SQL de Supabase.")