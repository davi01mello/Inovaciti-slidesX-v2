/**
 * O plano B do fundo: mesmas cores e mesma direção de luz do shader, em CSS puro.
 *
 * Mora em arquivo próprio porque é usado em dois momentos distintos: enquanto a
 * sessão é verificada (LoginGate, antes de existir palco) e por baixo do shader
 * (AuthBackdrop, sempre montado). Ter os mesmos pixels nos dois lugares é o que
 * faz a montagem do palco não piscar: o que já estava na tela continua lá.
 *
 * data-ambient: a deriva é lentíssima (60s) e decorativa, e é a única coisa do app
 * isenta do corte global de reduce-motion (ver index.css). Congelada, a tela de
 * login virava um retângulo morto.
 */
export function StaticBackdrop() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-[#050607]">
      <div className="absolute inset-0 bg-[radial-gradient(125%_100%_at_50%_-10%,rgba(45,219,96,0.20),transparent_60%)]" />
      <div
        data-ambient="true"
        className="absolute -left-[12%] top-[8%] h-[560px] w-[560px] rounded-full opacity-[0.28]"
        style={{
          background: 'radial-gradient(circle, #2ddb60 0%, transparent 65%)',
          filter: 'blur(90px)',
          animation: 'aurora-drift-a 60s ease-in-out infinite',
        }}
      />
      <div
        data-ambient="true"
        className="absolute -right-[10%] bottom-[6%] h-[480px] w-[480px] rounded-full opacity-[0.18]"
        style={{
          background: 'radial-gradient(circle, #7af2a5 0%, transparent 65%)',
          filter: 'blur(90px)',
          animation: 'aurora-drift-b 60s ease-in-out infinite',
        }}
      />
    </div>
  );
}
