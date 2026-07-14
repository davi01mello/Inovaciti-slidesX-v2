/**
 * Fundo aurora do Hero: dois orbes desfocados (verde e ciano) derivando em loop de 60s,
 * CSS puro. Sutil por regra: nunca pode chamar mais atenção que o CTA.
 */
export function AuroraBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute -left-24 -top-32 h-[460px] w-[460px] rounded-full opacity-[0.16]"
        style={{
          background: 'radial-gradient(circle, #2ddb60 0%, transparent 65%)',
          filter: 'blur(80px)',
          animation: 'aurora-drift-a 60s ease-in-out infinite',
        }}
      />
      <div
        className="absolute -right-20 top-16 h-[380px] w-[380px] rounded-full opacity-[0.10]"
        style={{
          background: 'radial-gradient(circle, #23c9c9 0%, transparent 65%)',
          filter: 'blur(80px)',
          animation: 'aurora-drift-b 60s ease-in-out infinite',
        }}
      />
    </div>
  );
}
