import { sql } from '@/lib/db';
import LoginCorpoelec from "./login/page";

export default async function Home() {
  try {
    // Hacemos una consulta rápida para validar que Neon responde
    const response = await sql`SELECT NOW()`;
    console.log("Conexión exitosa a Neon:", response[0].now);

    // 2. Si la conexión es exitosa, mostramos tu Login
    return (
      <>
        {/* Banner temporal de éxito (puedes borrarlo después) */}
        <div style={{ background: '#d4edda', padding: '10px', textAlign: 'center' }}>
          ✅ Base de datos conectada: {response[0].now.toString()}
        </div>

        <LoginCorpoelec />
      </>
    );

  } catch (error) {
    console.error("Error conectando a la DB:", error);
    return <div>Error al conectar con la base de datos. Revisa la consola.</div>;
  }
}